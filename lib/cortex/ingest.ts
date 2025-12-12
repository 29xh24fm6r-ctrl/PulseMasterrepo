// Neocortex Event Ingestor
// lib/cortex/ingest.ts

import { supabaseAdmin } from '@/lib/supabase';
import { CortexEvent } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function recordCortexEvent(event: CortexEvent) {
  const { userId, areaKey, source, eventType, eventTime, contextId, contextType, payload } = event;

  const dbUserId = await resolveUserId(userId);

  const { error } = await supabaseAdmin
    .from('cortex_events')
    .insert({
      user_id: dbUserId,
      area_key: areaKey,
      source,
      event_type: eventType,
      event_time: eventTime.toISOString(),
      context_id: contextId ?? null,
      context_type: contextType ?? null,
      payload: payload ?? {},
    });

  if (error) {
    console.error('[Cortex] recordCortexEvent error', error);
    throw error;
  }
}

// Helper: Record task completed
export async function recordTaskCompleted(params: {
  userId: string;
  taskId: string;
  completedAt: Date;
  metadata?: any;
}) {
  await recordCortexEvent({
    userId: params.userId,
    areaKey: 'work',
    source: 'tasks',
    eventType: 'TASK_COMPLETED',
    eventTime: params.completedAt,
    contextId: params.taskId,
    contextType: 'task',
    payload: params.metadata || {},
  });
}

// Helper: Record deal stage changed
export async function recordDealStageChanged(params: {
  userId: string;
  dealId: string;
  fromStage?: string;
  toStage: string;
  changedAt: Date;
  metadata?: any;
}) {
  await recordCortexEvent({
    userId: params.userId,
    areaKey: 'work',
    source: 'deals',
    eventType: 'DEAL_STAGE_CHANGED',
    eventTime: params.changedAt,
    contextId: params.dealId,
    contextType: 'deal',
    payload: {
      fromStage: params.fromStage,
      toStage: params.toStage,
      ...params.metadata,
    },
  });
}

// Helper: Record meeting held
export async function recordMeetingHeld(params: {
  userId: string;
  meetingId: string;
  startedAt: Date;
  endedAt?: Date;
  durationMinutes?: number;
  metadata?: any;
}) {
  await recordCortexEvent({
    userId: params.userId,
    areaKey: 'work',
    source: 'calendar',
    eventType: 'MEETING_HELD',
    eventTime: params.startedAt,
    contextId: params.meetingId,
    contextType: 'meeting',
    payload: {
      endedAt: params.endedAt?.toISOString(),
      durationMinutes: params.durationMinutes,
      ...params.metadata,
    },
  });
}

// Helper: Record email sent
export async function recordEmailSent(params: {
  userId: string;
  emailId: string;
  sentAt: Date;
  toAddresses?: string[];
  metadata?: any;
}) {
  await recordCortexEvent({
    userId: params.userId,
    areaKey: 'work',
    source: 'email',
    eventType: 'EMAIL_SENT',
    eventTime: params.sentAt,
    contextId: params.emailId,
    contextType: 'email',
    payload: {
      toAddresses: params.toAddresses,
      ...params.metadata,
    },
  });
}

// Helper: Record task created
export async function recordTaskCreated(params: {
  userId: string;
  taskId: string;
  createdAt: Date;
  metadata?: any;
}) {
  await recordCortexEvent({
    userId: params.userId,
    areaKey: 'work',
    source: 'tasks',
    eventType: 'TASK_CREATED',
    eventTime: params.createdAt,
    contextId: params.taskId,
    contextType: 'task',
    payload: params.metadata || {},
  });
}

// Helper: Record deal created
export async function recordDealCreated(params: {
  userId: string;
  dealId: string;
  createdAt: Date;
  metadata?: any;
}) {
  await recordCortexEvent({
    userId: params.userId,
    areaKey: 'work',
    source: 'deals',
    eventType: 'DEAL_CREATED',
    eventTime: params.createdAt,
    contextId: params.dealId,
    contextType: 'deal',
    payload: params.metadata || {},
  });
}


