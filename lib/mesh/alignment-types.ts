// Collective Alignment Types (shared between server and client)
// lib/mesh/alignment-types.ts

export interface UserCollectiveAlignment {
  patternCode: string;
  fitScore: number;
  description: string;
  strengths: string[];
  recommendedProtocols: string[];
}

