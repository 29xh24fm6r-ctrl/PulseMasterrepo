// Frontier Module Voice Tools - Combines all new voice commands
import { SIMULATION_VOICE_TOOLS, handleSimulationVoiceCommand } from "../simulation/voice";
import { LONGITUDINAL_VOICE_TOOLS, handleLongitudinalVoiceCommand } from "../longitudinal/voice";

// Export all frontier voice tools combined
export const FRONTIER_VOICE_TOOLS = [
  ...SIMULATION_VOICE_TOOLS,
  ...LONGITUDINAL_VOICE_TOOLS,
];

// Unified handler for all frontier voice commands
export async function handleFrontierVoiceCommand(
  functionName: string,
  args: Record<string, any>,
  userId: string
): Promise<string | null> {
  // Simulation commands
  if (["what_if_analysis", "create_life_simulation", "get_simulations"].includes(functionName)) {
    return handleSimulationVoiceCommand(functionName, args, userId);
  }

  // Longitudinal commands
  if (["start_life_chapter", "record_milestone", "update_growth_trajectory", "get_life_snapshot", "get_current_chapter", "detect_life_trends"].includes(functionName)) {
    return handleLongitudinalVoiceCommand(functionName, args, userId);
  }

  return null; // Not a frontier command
}

export default { FRONTIER_VOICE_TOOLS, handleFrontierVoiceCommand };