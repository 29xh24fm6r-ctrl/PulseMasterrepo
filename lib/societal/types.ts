// Societal Types (shared between server and client)
// lib/societal/types.ts

export interface SocietalInsight {
  title: string;
  body: string;
  type: "benchmark" | "warning" | "encouragement";
}

