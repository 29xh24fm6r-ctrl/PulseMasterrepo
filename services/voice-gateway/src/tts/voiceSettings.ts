export interface VoiceConfig {
    id: string; // OpenAI Voice ID (e.g. 'ash', 'coral', 'fable')
    speed: number;
    description: string;
    // Preferences (Defaults)
    confirmation_style?: 'direct' | 'gentle' | 'minimal';
    verbosity?: 'tight' | 'normal';
}

export class VoiceSettings {
    private static currentProfile: VoiceConfig = {
        id: "ash", // Default neutral
        speed: 1.0,
        description: "Default Neutral",
        confirmation_style: 'gentle',
        verbosity: 'normal'
    };

    private static profiles: Record<string, VoiceConfig> = {
        "DEFAULT": {
            id: "ash",
            speed: 1.0,
            description: "Default Neutral",
            confirmation_style: 'gentle',
            verbosity: 'normal'
        },
        "REGENT": {
            id: "fable",
            speed: 0.9,
            description: "British Professional",
            confirmation_style: 'direct',
            verbosity: 'tight'
        },
        "SOOTHE": {
            id: "coral",
            speed: 0.95,
            description: "Gentle Support",
            confirmation_style: 'gentle',
            verbosity: 'normal'
        }
    };

    static setProfile(key: string) {
        if (this.profiles[key]) {
            this.currentProfile = { ...this.profiles[key] };
        } else {
            console.warn(`[VoiceSettings] Unknown profile '${key}', ignoring.`);
        }
    }

    static getProfile(): VoiceConfig {
        return { ...this.currentProfile };
    }
}
