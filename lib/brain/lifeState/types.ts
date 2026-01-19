
export type EnergyLevel = 'low' | 'medium' | 'high';
export type StressLevel = 'low' | 'medium' | 'high';
export type MomentumState = 'stalled' | 'steady' | 'accelerating';

export type LifeStateSnapshot = {
    energy: EnergyLevel;
    stress: StressLevel;
    momentum: MomentumState;
    riskFlags: string[];
    lastUpdated: string; // ISO timestamp
};

export type LifeContext = {
    taskLoad: number;      // Count of overdue/today tasks
    calendarDensity: number; // Events per day
    recentReverts: number; // Autonomy failures
    chefInventoryGap: number; // Percent of missing staples
};
