export type FeatureStatus = "core" | "beta" | "hidden";

export type FeatureLink = {
  label: string;
  href: string;
};

export type FeatureApi = {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  ping?: boolean;
};

export type FeaturePlan = "free" | "pro" | "enterprise";

export type FeatureFlag = string;

export type FeatureGate =
  | { kind: "public" } // accessible without auth
  | { kind: "auth" } // requires signed in
  | { kind: "plan"; min: FeaturePlan } // requires plan >= min
  | { kind: "role"; anyOf: ("admin" | "ops" | "internal")[] } // requires user role
  | { kind: "flag"; flag: FeatureFlag } // feature flag must be enabled
  | { kind: "all"; gates: FeatureGate[] } // all required
  | { kind: "any"; gates: FeatureGate[] }; // any one sufficient

export type FeatureDef = {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  group: "Core" | "Work" | "Relationships" | "Voice" | "Settings" | "Ops" | "Labs";
  links: FeatureLink[];
  apis?: FeatureApi[];

  /**
   * Observed API usage discovered by scanning repo source (fetch/axios/SWR).
   * This is auto-generated; do not hand-edit.
   */
  observed_apis?: FeatureApi[];

  /**
   * Diagnostics produced by the generator (optional).
   */
  diagnostics?: {
    missing_apis?: { caller_file: string; api: string }[];
    unowned_calls?: { caller_file: string; api: string }[];
    unused_defined_apis?: { api: string }[];
  };

  /**
   * Registry-driven access control.
   * Defaults: auth for most app pages; public for marketing/public endpoints.
   */
  gate?: FeatureGate;

  /**
   * Optional: if locked, show this message in UI.
   */
  locked_copy?: string;
};

