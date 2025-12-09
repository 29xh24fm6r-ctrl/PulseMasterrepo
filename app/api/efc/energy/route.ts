// API Route: /api/efc/energy
// Track and query energy state

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { EnergyMatcher } from "@/lib/efc/energy-matcher";
import { PriorityEngine } from "@/lib/efc/priority-engine";
import { ActionGenerator } from "@/lib/efc/action-generator";

// GET /api/efc/energy - Get current energy state and recommendations
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const energyState = await EnergyMatcher.getCurrentEnergyState(userId);
    const checkInPrompt = await EnergyMatcher.generateEnergyCheckInPrompt(userId);

    // Get energy-matched recommendations
    const rawActions = await ActionGenerator.getSuggestedActions(userId, { limit: 20 });
    const actions = PriorityEngine.prioritizeActions({ actions: rawActions, energy_state: energyState || undefined });
    const recommendations = await EnergyMatcher.getEnergyMatchedRecommendations(
      userId,
      actions,
      5
    );

    return NextResponse.json({
      energy_state: energyState,
      check_in_prompt: checkInPrompt,
      recommendations: recommendations.recommendations.map(r => ({
        id: r.id,
        title: r.title,
        energy_required: r.energy_required,
        estimated_minutes: r.estimated_minutes,
        priority_score: r.priority_score,
      })),
      explanation: recommendations.explanation,
    });
  } catch (error: any) {
    console.error("[EFC Energy GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/efc/energy - Record energy check-in
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { energy_level, trend, factors, notes } = body;

    if (!energy_level) {
      return NextResponse.json(
        { error: "energy_level required" },
        { status: 400 }
      );
    }

    const energyState = await EnergyMatcher.recordEnergyState(userId, {
      energy_level,
      trend,
      factors,
      notes,
    });

    // Update action priorities based on new energy
    await PriorityEngine.updateStoredPriorities(userId, energyState);

    // Get updated recommendations
    const rawActions = await ActionGenerator.getSuggestedActions(userId, { limit: 20 });
    const actions = PriorityEngine.prioritizeActions({ actions: rawActions, energy_state: energyState || undefined });
    const recommendations = await EnergyMatcher.getEnergyMatchedRecommendations(
      userId,
      actions,
      5
    );

    return NextResponse.json({
      success: true,
      energy_state: energyState,
      recommendations: recommendations.recommendations.map(r => ({
        id: r.id,
        title: r.title,
        energy_required: r.energy_required,
        priority_score: r.priority_score,
      })),
      explanation: recommendations.explanation,
    });
  } catch (error: any) {
    console.error("[EFC Energy POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}