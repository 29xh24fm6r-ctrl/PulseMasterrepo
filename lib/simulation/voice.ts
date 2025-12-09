// Life Simulation Voice Commands
import { LifeSimulation } from "./index";

export const SIMULATION_VOICE_TOOLS = [
  {
    type: "function",
    name: "what_if_analysis",
    description: "Analyze a 'what if' scenario - explore potential outcomes of a decision or life change",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description: "The what-if question to analyze, e.g., 'What if I quit my job?'"
        },
        context: {
          type: "object",
          description: "Additional context about the situation"
        }
      },
      required: ["question"]
    }
  },
  {
    type: "function",
    name: "create_life_simulation",
    description: "Create a full life simulation to explore multiple scenarios for a major decision",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string", description: "Title for the simulation" },
        type: {
          type: "string",
          enum: ["decision", "goal", "change", "career", "relationship", "financial"],
          description: "Type of simulation"
        },
        current_situation: { type: "object", description: "Description of current state" },
        time_horizon: {
          type: "string",
          enum: ["1_month", "6_months", "1_year", "5_years"],
          description: "How far into the future to simulate"
        }
      },
      required: ["title", "type"]
    }
  },
  {
    type: "function",
    name: "get_simulations",
    description: "Get user's past simulations and what-if analyses",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["simulations", "what-ifs", "all"], description: "Which type to retrieve" }
      }
    }
  }
];

export async function handleSimulationVoiceCommand(
  functionName: string,
  args: Record<string, any>,
  userId: string
): Promise<string> {
  switch (functionName) {
    case "what_if_analysis": {
      const result = await LifeSimulation.analyzeWhatIf(userId, args.question, args.context);
      const outcomes = result.potential_outcomes?.slice(0, 3).map((o: any) => 
        `• ${o.outcome} (${o.probability} probability, ${o.impact} impact)`
      ).join("\n") || "No outcomes generated";
      
      return `**What If: ${args.question}**\n\n` +
        `**Category:** ${result.category}\n\n` +
        `**Key Factors:**\n${result.key_factors?.map((f: string) => `• ${f}`).join("\n")}\n\n` +
        `**Potential Outcomes:**\n${outcomes}\n\n` +
        `**Risks:** ${result.risks?.join(", ")}\n\n` +
        `**Benefits:** ${result.benefits?.join(", ")}\n\n` +
        `**Recommendation:** ${result.recommendation}`;
    }

    case "create_life_simulation": {
      const simulation = await LifeSimulation.createSimulation(userId, {
        title: args.title,
        type: args.type,
        baseScenario: args.current_situation || {},
        timeHorizon: args.time_horizon
      });
      const results = await LifeSimulation.runSimulation(simulation.id);
      const scenarioSummary = results.scenarios.map((s: any) => 
        `**${s.scenario_name}** (${s.scenario_type})\n${s.narrative || "No narrative"}`
      ).join("\n\n");
      
      return `**Life Simulation: ${args.title}**\n\n**Scenarios:**\n\n${scenarioSummary}\n\n**Recommended Path:** ${results.recommendedPath}`;
    }

    case "get_simulations": {
      const type = args.type || "all";
      let response = "";
      if (type === "simulations" || type === "all") {
        const sims = await LifeSimulation.getSimulations(userId);
        if (sims.length > 0) {
          response += `**Your Simulations:**\n${sims.slice(0, 5).map((s: any) => `• ${s.title} (${s.status})`).join("\n")}\n\n`;
        }
      }
      if (type === "what-ifs" || type === "all") {
        const whatIfs = await LifeSimulation.getWhatIfs(userId, 5);
        if (whatIfs.length > 0) {
          response += `**Recent What-If Analyses:**\n${whatIfs.map((w: any) => `• "${w.question}"`).join("\n")}`;
        }
      }
      return response || "No simulations found. Ask me 'What if...' to start!";
    }

    default:
      return "Unknown simulation command";
  }
}

export default { SIMULATION_VOICE_TOOLS, handleSimulationVoiceCommand };