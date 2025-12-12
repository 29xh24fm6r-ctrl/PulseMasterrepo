// Strategy Domain Autonomy Policies v3
// lib/cortex/autonomy/policies/strategy-policies.ts

import { registerPolicy, AutonomyPolicy, AutonomyAction } from "../v3";
import { PulseCortexContext } from "../../types";
import { PulseCortexContext } from "../../types";

/**
 * Policy: Stalled Arc Recovery
 */
const stalledArcPolicy: AutonomyPolicy = {
  id: "strategy:stalled_arc",
  domain: "strategy",
  name: "Stalled Arc Recovery",
  description: "Alert when strategic arcs have stalled",
  priority: 12,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.strategy?.arcs) return actions;

    const stalledArcs = ctx.domains.strategy.arcs.filter(
      (arc) => arc.progress < 0.1 && arc.priority <= 3
    );

    for (const arc of stalledArcs.slice(0, 2)) {
      actions.push({
        id: `arc_recovery_${arc.id}`,
        domain: "strategy",
        title: `Revive arc: ${arc.name}`,
        description: `Progress: ${Math.round(arc.progress * 100)}%`,
        severity: "warning",
        payload: {
          type: "arc_recovery",
          arcId: arc.id,
          arcName: arc.name,
          suggestedAction: "review_and_plan_next_milestone",
        },
        metadata: {
          progress: arc.progress,
          priority: arc.priority,
        },
      });
    }

    return actions;
  },
};

/**
 * Policy: Quarterly Focus Alignment
 */
const quarterlyAlignmentPolicy: AutonomyPolicy = {
  id: "strategy:quarterly_alignment",
  domain: "strategy",
  name: "Quarterly Focus Alignment",
  description: "Check if daily work aligns with quarterly goals",
  priority: 10,
  evaluate: (ctx: PulseCortexContext): AutonomyAction[] => {
    const actions: AutonomyAction[] = [];

    if (!ctx.domains.strategy?.currentQuarterFocus) return actions;
    if (!ctx.domains.work?.queue) return actions;

    const bigThree = ctx.domains.strategy.currentQuarterFocus.bigThree;
    if (bigThree.length === 0) return actions;

    const relatedItems = ctx.domains.work.queue.filter((item) => {
      const titleLower = item.title.toLowerCase();
      return bigThree.some((goal) =>
        titleLower.includes(goal.title.toLowerCase().substring(0, 10))
      );
    });

    const alignmentRatio =
      ctx.domains.work.queue.length > 0
        ? relatedItems.length / ctx.domains.work.queue.length
        : 0;

    if (alignmentRatio < 0.3) {
      actions.push({
        id: "quarterly_alignment_alert",
        domain: "strategy",
        title: "⚠️ Work not aligned with quarterly focus",
        description: `Only ${Math.round(alignmentRatio * 100)}% of tasks relate to Big 3`,
        severity: "warning",
        payload: {
          type: "alignment_alert",
          suggestedAction: "review_and_prioritize",
          alignmentRatio,
        },
        metadata: {
          bigThreeCount: bigThree.length,
          relatedItemsCount: relatedItems.length,
        },
      });
    }

    return actions;
  },
};

// Register all policies
registerPolicy(stalledArcPolicy);
registerPolicy(quarterlyAlignmentPolicy);

