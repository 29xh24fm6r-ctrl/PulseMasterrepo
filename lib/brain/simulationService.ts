import { ReasoningResult, SimulationResult, SimulationInput, DecisionIntent } from './types';
import { SimulationResultSchema } from './schemas';
import { getOpenAI } from "@/services/ai/openai";

export class SimulationService {
    // private openai: OpenAI | null = null; // No longer needed with singleton util

    private async getClient() {
        return await getOpenAI();
    }

    /**
     * Simulates the outcomes of the candidate intents provided by the Reasoning Engine.
     */
    async runSimulation(input: SimulationInput): Promise<SimulationResult> {
        console.log(`[SimulationService] Simulating ${input.reasoning.candidate_intents.length} candidates...`);

        try {
            const client = await this.getClient();
            const completion = await client.chat.completions.create({
                model: "gpt-4o", // Strongest model for complex simulation
                messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    {
                        role: "user", content: JSON.stringify({
                            context: {
                                summary: input.recall.short_term_summary,
                                momentum: input.recall.momentum_snapshot,
                                identity: input.recall.identity_trajectory
                            },
                            candidates: input.reasoning.candidate_intents,
                            second_order_heuristics: "See metadata" // In real impl, pass the heuristics here
                        })
                    }
                ],
                response_format: { type: "json_object" }
            });

            const rawContent = completion.choices[0].message.content;
            if (!rawContent) throw new Error("Empty response from Simulation Engine");

            // Parse and Validate
            const parsed = JSON.parse(rawContent);
            const validated = SimulationResultSchema.parse(parsed);

            return validated;

        } catch (error: any) {
            console.error("[SimulationService] ❌ Simulation Failed:", error);

            // Fallback for resiliency - Return a "Safe Mode" simulation
            return {
                baseline: {
                    summary: "Unable to simulate.",
                    predicted_outcomes: ["Unknown"],
                    risks: ["Simulation Error"],
                    momentum_projection: { trend: "flat", description: "Unknown" },
                    confidence: 0
                },
                scenarios: [],
                recommended_intent_title: null,
                confidence_adjustment: -0.5,
                uncertainty_flags: ["simulation_failed"]
            };
        }
    }
}

export const simulationService = new SimulationService();
