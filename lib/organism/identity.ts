/**
 * Identity Resolution Service
 * Single source of truth for resolving/creating Person/Org entities
 * lib/organism/identity.ts
 */

import { supabaseServer } from "@/lib/supabase/server";
import { IdentityInput, IdentityResolution } from "./types";

/**
 * Resolve or create a contact/organization identity
 * Prevents duplicates by matching on email/phone/domain
 */
export async function resolveIdentity(
  userId: string,
  input: IdentityInput
): Promise<IdentityResolution> {
  const supabase = supabaseServer();
  const matchedBy: IdentityResolution["matched_by"] = [];
  let contactId: string | null = null;
  let orgId: string | null = null;
  let didCreateContact = false;
  let didCreateOrg = false;
  let confidence: IdentityResolution["confidence"] = "low";

  // Step 1: Resolve organization if company/domain provided
  if (input.domain || input.company) {
    const orgResolution = await resolveOrganization(userId, {
      domain: input.domain,
      name: input.company,
    });

    orgId = orgResolution.org_id;
    didCreateOrg = orgResolution.did_create;
    if (orgResolution.matched_by.length > 0) {
      matchedBy.push(...orgResolution.matched_by);
      confidence = "medium";
    }
  } else if (input.organizationId) {
    // Use provided organization ID
    orgId = input.organizationId;
  }

  // Step 2: Resolve contact
  if (input.email || input.phone || input.name) {
    const contactResolution = await resolveContact(userId, {
      email: input.email,
      phone: input.phone,
      name: input.name,
      firstName: input.firstName,
      lastName: input.lastName,
      organization_id: orgId,
    });

    contactId = contactResolution.contact_id;
    didCreateContact = contactResolution.did_create;
    if (contactResolution.matched_by.length > 0) {
      matchedBy.push(...contactResolution.matched_by);
      confidence = contactResolution.matched_by.includes("email") ? "high" : confidence;
    }
  }

  // Step 3: Ensure TB node exists for entities
  let tbNodeId: string | null = null;
  if (contactId) {
    const nodeResult = await ensureTBNodeForEntity(userId, "person", contactId);
    tbNodeId = nodeResult.tb_node_id;
  } else if (orgId) {
    const nodeResult = await ensureTBNodeForEntity(userId, "organization", orgId);
    tbNodeId = nodeResult.tb_node_id;
  }

  return {
    contact_id: contactId,
    org_id: orgId,
    tb_node_id: tbNodeId,
    confidence,
    did_create_contact: didCreateContact,
    did_create_org: didCreateOrg,
    matched_by: matchedBy,
  };
}

/**
 * Resolve or create a contact
 */
async function resolveContact(
  userId: string,
  input: {
    email?: string;
    phone?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    organization_id?: string | null;
  }
): Promise<{
  contact_id: string;
  did_create: boolean;
  matched_by: ("email" | "phone" | "name")[];
}> {
  const supabase = supabaseServer();
  const matchedBy: ("email" | "phone" | "name")[] = [];

  // Try email match first (highest confidence)
  if (input.email) {
    const normalizedEmail = input.email.toLowerCase().trim();
    const { data: existing } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("owner_user_id", userId)
      .or(
        `primary_email.eq.${normalizedEmail},primary_email.ilike.%${normalizedEmail}%`
      )
      .maybeSingle();

    if (existing) {
      matchedBy.push("email");
      return {
        contact_id: existing.id,
        did_create: false,
        matched_by: matchedBy,
      };
    }
  }

  // Try phone match
  if (input.phone) {
    const normalizedPhone = input.phone.replace(/\D/g, ""); // Remove non-digits
    if (normalizedPhone.length >= 10) {
      const { data: existing } = await supabase
        .from("crm_contacts")
        .select("id")
        .eq("owner_user_id", userId)
        .or(
          `primary_phone.eq.${normalizedPhone},primary_phone.ilike.%${normalizedPhone}%`
        )
        .maybeSingle();

      if (existing) {
        matchedBy.push("phone");
        return {
          contact_id: existing.id,
          did_create: false,
          matched_by: matchedBy,
        };
      }
    }
  }

  // Try name match (lower confidence, only if we have first+last or full name)
  if ((input.firstName && input.lastName) || input.name) {
    const searchName = input.name || `${input.firstName} ${input.lastName}`;
    const { data: existing } = await supabase
      .from("crm_contacts")
      .select("id")
      .eq("owner_user_id", userId)
      .ilike("full_name", `%${searchName}%`)
      .maybeSingle();

    if (existing) {
      matchedBy.push("name");
      return {
        contact_id: existing.id,
        did_create: false,
        matched_by: matchedBy,
      };
    }
  }

  // No match found - create new contact
  const fullName = input.name || `${input.firstName || ""} ${input.lastName || ""}`.trim();
  const { data: created, error } = await supabase
    .from("crm_contacts")
    .insert({
      owner_user_id: userId,
      full_name: fullName || "Unknown",
      first_name: input.firstName || null,
      last_name: input.lastName || null,
      primary_email: input.email?.toLowerCase().trim() || null,
      primary_phone: input.phone || null,
      company_name: input.organization_id ? null : null, // Will be set via org link
      organization_id: input.organization_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create contact: ${error.message}`);
  }

  return {
    contact_id: created.id,
    did_create: true,
    matched_by: matchedBy,
  };
}

/**
 * Resolve or create an organization
 */
async function resolveOrganization(
  userId: string,
  input: {
    domain?: string;
    name?: string;
  }
): Promise<{
  org_id: string | null;
  did_create: boolean;
  matched_by: ("domain" | "name")[];
}> {
  const supabase = supabaseServer();
  const matchedBy: ("domain" | "name")[] = [];

  if (!input.domain && !input.name) {
    return {
      org_id: null,
      did_create: false,
      matched_by: matchedBy,
    };
  }

  // Try domain match first (highest confidence)
  if (input.domain) {
    const normalizedDomain = input.domain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
    const { data: existing } = await supabase
      .from("crm_organizations")
      .select("id")
      .eq("owner_user_id", userId)
      .or(`domain.eq.${normalizedDomain},website.ilike.%${normalizedDomain}%`)
      .maybeSingle();

    if (existing) {
      matchedBy.push("domain");
      return {
        org_id: existing.id,
        did_create: false,
        matched_by: matchedBy,
      };
    }
  }

  // Try name match
  if (input.name) {
    const normalizedName = input.name.trim();
    const { data: existing } = await supabase
      .from("crm_organizations")
      .select("id")
      .eq("owner_user_id", userId)
      .ilike("name", normalizedName)
      .maybeSingle();

    if (existing) {
      matchedBy.push("name");
      return {
        org_id: existing.id,
        did_create: false,
        matched_by: matchedBy,
      };
    }
  }

  // No match found - create new organization
  const normalizedDomain = input.domain?.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "") || null;
  const { data: created, error } = await supabase
    .from("crm_organizations")
    .insert({
      owner_user_id: userId,
      name: input.name || normalizedDomain || "Unknown Organization",
      domain: normalizedDomain,
      website: input.domain ? (input.domain.startsWith("http") ? input.domain : `https://${input.domain}`) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create organization: ${error.message}`);
  }

  return {
    org_id: created.id,
    did_create: true,
    matched_by: matchedBy,
  };
}

/**
 * Ensure a TB node exists for a CRM entity
 * Links CRM and Second Brain via tb_node_id
 */
export async function ensureTBNodeForEntity(
  userId: string,
  entityType: "person" | "organization" | "deal",
  entityId: string
): Promise<{ tb_node_id: string; did_create: boolean }> {
  const supabase = supabaseServer();

  // Get the entity to determine what to store in the node
  let entityData: any = null;
  let tableName: string;
  let title: string = "";

  if (entityType === "person") {
    tableName = "crm_contacts";
    const { data } = await supabase
      .from(tableName)
      .select("id, full_name, primary_email, company_name, tb_node_id")
      .eq("owner_user_id", userId)
      .eq("id", entityId)
      .single();
    entityData = data;
    title = data?.full_name || "Unknown Person";
  } else if (entityType === "organization") {
    tableName = "crm_organizations";
    const { data } = await supabase
      .from(tableName)
      .select("id, name, domain, tb_node_id")
      .eq("owner_user_id", userId)
      .eq("id", entityId)
      .single();
    entityData = data;
    title = data?.name || "Unknown Organization";
  } else {
    // deal
    tableName = "crm_deals";
    const { data } = await supabase
      .from(tableName)
      .select("id, name, stage, tb_node_id")
      .eq("owner_user_id", userId)
      .eq("id", entityId)
      .single();
    entityData = data;
    title = data?.name || "Unknown Deal";
  }

  if (!entityData) {
    throw new Error(`Entity not found: ${entityType} ${entityId}`);
  }

  // If tb_node_id already exists, return it
  if (entityData.tb_node_id) {
    // Verify the node still exists
    const { data: node } = await supabase
      .from("tb_nodes")
      .select("id")
      .eq("owner_user_id", userId)
      .eq("id", entityData.tb_node_id)
      .maybeSingle();

    if (node) {
      return {
        tb_node_id: entityData.tb_node_id,
        did_create: false,
      };
    }
  }

  // Create TB node
  const { data: node, error } = await supabase
    .from("tb_nodes")
    .insert({
      owner_user_id: userId,
      node_type: entityType,
      node_id: `${tableName}_${entityId}`,
      title,
      metadata: {
        crm_entity_type: entityType,
        crm_entity_id: entityId,
        ...(entityType === "person" && {
          email: entityData.primary_email,
          company: entityData.company_name,
        }),
        ...(entityType === "organization" && {
          domain: entityData.domain,
        }),
        ...(entityType === "deal" && {
          stage: entityData.stage,
        }),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create TB node: ${error.message}`);
  }

  // Update CRM entity with tb_node_id
  await supabase
    .from(tableName)
    .update({ tb_node_id: node.id })
    .eq("owner_user_id", userId)
    .eq("id", entityId);

  return {
    tb_node_id: node.id,
    did_create: true,
  };
}

