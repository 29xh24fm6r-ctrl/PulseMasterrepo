// Pulse Cortex - Central Cognitive Mesh
// lib/cortex/index.ts

export * from "./types";
export * from "./context";
export * from "./executive/index";
export * from "./autonomy";
export * from "./longitudinal";
export * from "./trace/types";
export * from "./trace/trace";
export * from "./xp-summary";

// Import domain autonomy adapters to register policies
import "./autonomy/policies/work-policies";
import "./autonomy/policies/relationship-policies";
import "./autonomy/policies/finance-policies";
import "./autonomy/policies/life-policies";
import "./autonomy/policies/strategy-policies";
