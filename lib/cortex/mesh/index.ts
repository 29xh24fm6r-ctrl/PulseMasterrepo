// Cognitive Mesh v2 - Domain Context Aggregator
// lib/cortex/mesh/index.ts

import { PulseDomainContext } from "../types";
import { buildWorkContext } from "./work/context";
import { buildRelationshipsContext } from "./relationships/context";
import { buildFinanceContext } from "./finance/context";
import { buildLifeContext } from "./life/context";
import { buildStrategyContext } from "./strategy/context";

/**
 * Build all domain contexts in parallel
 */
export async function buildDomainContexts(
  userId: string
): Promise<PulseDomainContext> {
  const [work, relationships, finance, life, strategy] = await Promise.all([
    buildWorkContext(userId),
    buildRelationshipsContext(userId),
    buildFinanceContext(userId),
    buildLifeContext(userId),
    buildStrategyContext(userId),
  ]);

  return {
    work,
    relationships,
    finance,
    life,
    strategy,
  };
}



