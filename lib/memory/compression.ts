// Memory Compression Library
import { createClient } from "@supabase/supabase-js";
import { llmJson } from "../llm/client";
import { getOpenAI } from "@/lib/llm/client";
// import OpenAI from "openai";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface CompressedMemory {
  id: string;
  user_id: string;
  compression_type: "daily" | "weekly" | "monthly" | "topic";
  time_period_start?: string;
  time_period_end?: string;
  topic?: string;
  summary: string;
  key_facts: string[];
  emotional_tone?: string;
  importance_score: number;
  source_fragment_count: number;
  created_at: string;
}

export interface CompressionSettings {
  auto_compress_enabled: boolean;
  daily_compress_after_days: number;
  weekly_compress_after_days: number;
  monthly_compress_after_days: number;
  min_fragments_for_compression: number;
  preserve_high_importance: boolean;
  importance_threshold: number;
}

export async function getCompressionSettings(userId: string): Promise<CompressionSettings> {
  const supabase = getSupabase();
  const { data } = await supabase.from("mem_compression_settings").select("*").eq("user_id", userId).single();
  if (data) return data;
  const defaults: CompressionSettings = {
    auto_compress_enabled: true,
    daily_compress_after_days: 7,
    weekly_compress_after_days: 30,
    monthly_compress_after_days: 90,
    min_fragments_for_compression: 5,
    preserve_high_importance: true,
    importance_threshold: 0.8,
  };
  await supabase.from("mem_compression_settings").insert({ user_id: userId, ...defaults });
  return defaults;
}

async function generateEmbedding(text: string): Promise<number[]> {
  const openai = getOpenAI();
  const response = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
  return response.data[0].embedding;
}

export async function compressFragments(fragments: any[]): Promise<{ summary: string; key_facts: string[]; emotional_tone: string; importance_score: number }> {
  const fragmentText = fragments.map((f, i) => `[${i + 1}] ${f.content}`).join("\n\n");
  const prompt = `Compress these memory fragments. Fragments:
${fragmentText}

Return JSON: {"summary": "...", "key_facts": ["..."], "emotional_tone": "...", "importance_score": 0.0-1.0}`;
  return llmJson({ prompt });
}

export async function compressDaily(userId: string, date: Date): Promise<CompressedMemory | null> {
  const supabase = getSupabase();
  const settings = await getCompressionSettings(userId);
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  let query = supabase.from("tb_memory_fragments").select("*").eq("user_id", userId).gte("occurred_at", startOfDay.toISOString()).lte("occurred_at", endOfDay.toISOString());
  if (settings.preserve_high_importance) {
    query = query.lt("importance", settings.importance_threshold * 10);
  }
  const { data: fragments } = await query;
  if (!fragments || fragments.length < settings.min_fragments_for_compression) return null;
  const compressed = await compressFragments(fragments);
  const embedding = await generateEmbedding(compressed.summary);
  const { data, error } = await supabase.from("mem_compressed").insert({
    user_id: userId,
    compression_type: "daily",
    time_period_start: startOfDay.toISOString(),
    time_period_end: endOfDay.toISOString(),
    summary: compressed.summary,
    key_facts: compressed.key_facts,
    emotional_tone: compressed.emotional_tone,
    importance_score: compressed.importance_score,
    source_fragment_count: fragments.length,
    source_fragment_ids: fragments.map((f) => f.id),
    embedding,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function runAutoCompression(userId: string): Promise<{ daily_compressed: number; weekly_compressed: number }> {
  const settings = await getCompressionSettings(userId);
  if (!settings.auto_compress_enabled) return { daily_compressed: 0, weekly_compressed: 0 };
  let dailyCompressed = 0;
  const dailyCutoff = new Date();
  dailyCutoff.setDate(dailyCutoff.getDate() - settings.daily_compress_after_days);
  for (let i = 0; i < 7; i++) {
    const date = new Date(dailyCutoff);
    date.setDate(date.getDate() - i);
    const result = await compressDaily(userId, date);
    if (result) dailyCompressed++;
  }
  return { daily_compressed: dailyCompressed, weekly_compressed: 0 };
}

export async function getCompressedMemories(userId: string, type?: "daily" | "weekly" | "monthly" | "topic"): Promise<CompressedMemory[]> {
  const supabase = getSupabase();
  let query = supabase.from("mem_compressed").select("*").eq("user_id", userId).order("time_period_start", { ascending: false });
  if (type) query = query.eq("compression_type", type);
  const { data } = await query.limit(50);
  return data || [];
}

export async function searchCompressedMemories(userId: string, queryText: string, limit = 10): Promise<CompressedMemory[]> {
  const supabase = getSupabase();
  const embedding = await generateEmbedding(queryText);
  const { data } = await supabase.rpc("search_compressed_memories", { query_embedding: embedding, match_user_id: userId, match_count: limit });
  return data || [];
}

export const MemoryCompression = { getCompressionSettings, compressFragments, compressDaily, runAutoCompression, getCompressedMemories, searchCompressedMemories };
export default MemoryCompression;