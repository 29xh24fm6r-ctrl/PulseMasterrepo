import type { FeatureDef } from "./types";
import { GENERATED_FEATURES } from "./registry.generated";
import { MANUAL_FEATURE_OVERRIDES } from "./registry.manual";

function mergeFeature(base: FeatureDef, override?: Partial<FeatureDef>): FeatureDef {
  if (!override) return base;

  // Merge scalars; merge links/apis by union (override can replace entirely if you want—here we union)
  const links = (() => {
    const byHref = new Map<string, { label: string; href: string }>();
    for (const l of base.links || []) byHref.set(l.href, l);
    for (const l of override.links || []) byHref.set(l.href, l);
    return Array.from(byHref.values());
  })();

  const apis = (() => {
    const byKey = new Map<string, any>();
    for (const a of base.apis || []) byKey.set(`${a.method}:${a.path}`, a);
    for (const a of override.apis || []) byKey.set(`${a.method}:${a.path}`, a);
    const arr = Array.from(byKey.values());
    return arr.length ? arr : undefined;
  })();

  return {
    ...base,
    ...override,
    links,
    apis,
  };
}

const overrideMap = new Map<string, Partial<FeatureDef>>();
for (const o of MANUAL_FEATURE_OVERRIDES) {
  if (o?.id) overrideMap.set(o.id, o);
}

export const FEATURE_REGISTRY: FeatureDef[] = GENERATED_FEATURES.map((f) => mergeFeature(f, overrideMap.get(f.id)));

// Export types for convenience
export type { FeatureDef, FeatureApi, FeatureLink, FeatureStatus } from "./types";
