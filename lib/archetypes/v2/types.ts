// Archetype Engine v2 - Types
// lib/archetypes/v2/types.ts

export type ArchetypeId =
  | 'warrior'
  | 'builder'
  | 'king'
  | 'sage'
  | 'lover'
  | 'magician'
  | 'trickster'
  | 'guardian'
  | 'creator'
  | 'rebel'
  | 'healer'
  | 'explorer'
  | string;

export interface ArchetypeMixEntry {
  id: ArchetypeId;
  strength: number;        // 0..1
  mode: 'healthy' | 'shadow';
  notes?: string;
}


