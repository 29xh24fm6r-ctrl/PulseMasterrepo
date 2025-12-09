// Pulse Kernel: Proactive Action Layer
// Scans memory, calendar, inbox, CRM, tasks
// Creates tasks, prepares materials, drafts communications AUTOMATICALLY

import {
  ProactiveAction,
  UserProfile,
  Memory,
  ContextWindow,
  CalendarEvent,
  RelationshipMemory,
} from './types';

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  project?: string;
}

interface Deal {
  id: string;
  name: string;
  company: string;
  stage: string;
  value: number;
  lastContact: Date | null;
  contactName?: string;
  contactEmail?: string;
}

interface FollowUp {
  id: string;
  personName: string;
  company?: string;
  type: string;
  status: string;
  dueDate: Date | null;
}

interface Email {
  id: string;
  from: string;
  subject: string;
  received: Date;
  read: boolean;
  requiresResponse: boolean;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'urgent';
}

/**
 * PROACTIVE ACTION ENGINE
 * Autonomously handles tasks to reduce user burden
 */
export const proactiveEngine = {
  /**
   * Main proactive scanning function
   * Runs periodically to identify and execute/propose actions
   */
  async proactiveAct(
    userProfile: UserProfile,
    memory: Memory,
    context: ContextWindow,
    data: {
      tasks: Task[];
      deals: Deal[];
      followUps: FollowUp[];
      calendar: CalendarEvent[];
      emails?: Email[];
    }
  ): Promise<ProactiveAction[]> {
    const actions: ProactiveAction[] = [];

    // Scan all systems for proactive opportunities
    actions.push(...this.scanCalendarForPrep(data.calendar, memory, context));
    actions.push(...this.scanDealsForFollowUp(data.deals, memory));
    actions.push(...this.scanTasksForAutomation(data.tasks, userProfile));
    actions.push(...this.scanFollowUpsForDrafts(data.followUps, memory));
    actions.push(...this.scanRelationshipsForOutreach(memory.relationships));
    
    if (data.emails) {
      actions.push(...this.scanEmailsForActions(data.emails, memory));
    }

    // Score and prioritize actions
    return this.prioritizeActions(actions, userProfile);
  },

  /**
   * Scan calendar and prepare for upcoming events
   */
  scanCalendarForPrep(
    events: CalendarEvent[],
    memory: Memory,
    context: ContextWindow
  ): ProactiveAction[] {
    const actions: ProactiveAction[] = [];
    const now = new Date();

    for (const event of events) {
      const eventStart = new Date(event.start);
      const hoursUntil = (eventStart.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Meeting prep: 2-24 hours before
      if (event.type === 'meeting' && hoursUntil > 2 && hoursUntil <= 24) {
        // Gather relevant info about attendees
        const attendeeInfo = event.attendees?.map(attendee => {
          return memory.relationships.find(r => 
            r.name.toLowerCase().includes(attendee.toLowerCase())
          );
        }).filter(Boolean);

        actions.push({
          id: `prep-${event.id}`,
          type: 'prepare_materials',
          title: `Prepare briefing for: ${event.title}`,
          description: 'Generate meeting prep with attendee background and talking points',
          status: 'proposed',
          payload: {
            eventId: event.id,
            eventTitle: event.title,
            attendees: event.attendees,
            attendeeInfo,
            prepType: 'meeting_brief',
          },
          createdAt: new Date(),
          reasoning: `Meeting in ${Math.round(hoursUntil)} hours. Preparation increases effectiveness.`,
          impactScore: 7,
          userApprovalRequired: false, // Can auto-generate brief
        });
      }

      // Create reminder task for important events
      if (event.type === 'deadline' && hoursUntil > 24 && hoursUntil <= 72) {
        actions.push({
          id: `deadline-task-${event.id}`,
          type: 'auto_task',
          title: `Create progress check for: ${event.title}`,
          description: 'Add task to review progress before deadline',
          status: 'proposed',
          payload: {
            taskTitle: `Review progress: ${event.title}`,
            dueDate: new Date(eventStart.getTime() - 24 * 60 * 60 * 1000), // 24h before
            priority: 'high',
            linkedEvent: event.id,
          },
          createdAt: new Date(),
          reasoning: 'Proactive progress check prevents last-minute rushes',
          impactScore: 6,
          userApprovalRequired: true,
        });
      }
    }

    return actions;
  },

  /**
   * Scan deals for follow-up opportunities
   */
  scanDealsForFollowUp(deals: Deal[], memory: Memory): ProactiveAction[] {
    const actions: ProactiveAction[] = [];
    const now = new Date();

    for (const deal of deals) {
      // Skip closed deals
      if (['Closed Won', 'Closed Lost', 'Funded', 'Dead'].includes(deal.stage)) continue;

      if (!deal.lastContact) continue;

      const daysSinceContact = Math.floor(
        (now.getTime() - new Date(deal.lastContact).getTime()) / (1000 * 60 * 60 * 24)
      );

      // 7-10 days: Suggest follow-up
      if (daysSinceContact >= 7 && daysSinceContact < 14) {
        // Get relationship context if available
        const relationship = memory.relationships.find(r => 
          r.name.toLowerCase().includes((deal.contactName || '').toLowerCase())
        );

        actions.push({
          id: `deal-followup-${deal.id}`,
          type: 'draft_communication',
          title: `Draft follow-up for: ${deal.name}`,
          description: `${deal.company} - ${daysSinceContact} days since last contact`,
          status: 'proposed',
          payload: {
            dealId: deal.id,
            dealName: deal.name,
            company: deal.company,
            stage: deal.stage,
            contactName: deal.contactName,
            contactEmail: deal.contactEmail,
            daysSinceContact,
            relationship,
            draftType: 'check_in',
          },
          createdAt: new Date(),
          reasoning: `${daysSinceContact} days without contact. Keep deal warm with a check-in.`,
          impactScore: 8,
          userApprovalRequired: true, // User should review before sending
        });
      }

      // 14+ days: Urgent re-engagement
      if (daysSinceContact >= 14) {
        actions.push({
          id: `deal-reengage-${deal.id}`,
          type: 'draft_communication',
          title: `URGENT: Re-engage ${deal.name}`,
          description: `${deal.company} - ${daysSinceContact} days cold`,
          status: 'proposed',
          payload: {
            dealId: deal.id,
            dealName: deal.name,
            company: deal.company,
            stage: deal.stage,
            contactName: deal.contactName,
            contactEmail: deal.contactEmail,
            daysSinceContact,
            draftType: 're_engagement',
            urgent: true,
          },
          createdAt: new Date(),
          reasoning: `Deal at risk! ${daysSinceContact} days is too long. Draft re-engagement message.`,
          impactScore: 10,
          userApprovalRequired: true,
        });
      }

      // Stage-specific actions
      if (deal.stage === 'Proposal') {
        actions.push({
          id: `deal-proposal-${deal.id}`,
          type: 'reminder',
          title: `Check proposal status: ${deal.name}`,
          description: 'Proposals need active follow-up',
          status: 'proposed',
          payload: {
            dealId: deal.id,
            action: 'check_proposal_status',
          },
          createdAt: new Date(),
          reasoning: 'Proposals in flight need regular status checks',
          impactScore: 7,
          userApprovalRequired: false,
        });
      }
    }

    return actions;
  },

  /**
   * Scan tasks for automation opportunities
   */
  scanTasksForAutomation(tasks: Task[], userProfile: UserProfile): ProactiveAction[] {
    const actions: ProactiveAction[] = [];
    const now = new Date();

    // Find recurring task patterns
    const taskTitles = tasks.map(t => t.title.toLowerCase());
    const titleCounts: Record<string, number> = {};
    
    for (const title of taskTitles) {
      // Normalize similar titles
      const normalized = title.replace(/\d+/g, '#').replace(/\s+/g, ' ').trim();
      titleCounts[normalized] = (titleCounts[normalized] || 0) + 1;
    }

    // Suggest automation for recurring tasks
    for (const [pattern, count] of Object.entries(titleCounts)) {
      if (count >= 3) {
        actions.push({
          id: `automate-${pattern.substring(0, 20)}`,
          type: 'auto_task',
          title: `Automate recurring task: "${pattern}"`,
          description: `This task pattern appears ${count} times`,
          status: 'proposed',
          payload: {
            pattern,
            count,
            suggestion: 'Create recurring task template',
          },
          createdAt: new Date(),
          reasoning: `Recurring pattern detected (${count}x). Automation saves time.`,
          impactScore: 5,
          userApprovalRequired: true,
        });
      }
    }

    // Overdue task escalation
    const overdueTasks = tasks.filter(t => {
      if (t.status === 'Done' || t.status === 'Completed') return false;
      if (!t.dueDate) return false;
      return new Date(t.dueDate) < now;
    });

    if (overdueTasks.length >= 5) {
      actions.push({
        id: 'batch-overdue',
        type: 'schedule',
        title: 'Schedule catch-up block',
        description: `${overdueTasks.length} overdue tasks need attention`,
        status: 'proposed',
        payload: {
          taskIds: overdueTasks.map(t => t.id),
          suggestedDuration: Math.min(180, overdueTasks.length * 20), // ~20 min per task
          suggestedTime: 'next_available_2hr_block',
        },
        createdAt: new Date(),
        reasoning: 'Multiple overdue tasks detected. Batch processing is more effective.',
        impactScore: 8,
        userApprovalRequired: true,
      });
    }

    return actions;
  },

  /**
   * Scan follow-ups and draft messages
   */
  scanFollowUpsForDrafts(followUps: FollowUp[], memory: Memory): ProactiveAction[] {
    const actions: ProactiveAction[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (const followUp of followUps) {
      if (followUp.status === 'done' || followUp.status === 'sent') continue;
      if (!followUp.dueDate) continue;

      const dueDate = new Date(followUp.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Due tomorrow: Draft message now
      if (daysDiff === 1) {
        const relationship = memory.relationships.find(r =>
          r.name.toLowerCase().includes(followUp.personName.toLowerCase())
        );

        actions.push({
          id: `draft-followup-${followUp.id}`,
          type: 'draft_communication',
          title: `Draft message for: ${followUp.personName}`,
          description: `Follow-up due tomorrow${followUp.company ? ` (${followUp.company})` : ''}`,
          status: 'proposed',
          payload: {
            followUpId: followUp.id,
            personName: followUp.personName,
            company: followUp.company,
            type: followUp.type,
            relationship,
            draftType: 'follow_up',
          },
          createdAt: new Date(),
          reasoning: 'Follow-up due tomorrow. Pre-drafted message saves time.',
          impactScore: 7,
          userApprovalRequired: true,
        });
      }

      // Overdue: Urgent draft
      if (daysDiff < 0) {
        actions.push({
          id: `urgent-draft-${followUp.id}`,
          type: 'draft_communication',
          title: `URGENT: Draft apology + follow-up for ${followUp.personName}`,
          description: `${Math.abs(daysDiff)} days overdue`,
          status: 'proposed',
          payload: {
            followUpId: followUp.id,
            personName: followUp.personName,
            company: followUp.company,
            daysOverdue: Math.abs(daysDiff),
            draftType: 'overdue_follow_up',
          },
          createdAt: new Date(),
          reasoning: 'Overdue follow-up. Draft message with appropriate acknowledgment.',
          impactScore: 9,
          userApprovalRequired: true,
        });
      }
    }

    return actions;
  },

  /**
   * Scan relationships for proactive outreach
   */
  scanRelationshipsForOutreach(relationships: RelationshipMemory[]): ProactiveAction[] {
    const actions: ProactiveAction[] = [];
    const now = new Date();

    for (const relationship of relationships) {
      // Check for important upcoming dates
      for (const importantDate of relationship.importantDates || []) {
        const date = new Date(importantDate.date);
        const daysUntil = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        // 7 days before important date
        if (daysUntil > 0 && daysUntil <= 7) {
          actions.push({
            id: `birthday-${relationship.personId}-${importantDate.date}`,
            type: 'reminder',
            title: `${importantDate.description} coming up: ${relationship.name}`,
            description: `In ${daysUntil} days`,
            status: 'proposed',
            payload: {
              personId: relationship.personId,
              personName: relationship.name,
              eventType: importantDate.description,
              eventDate: importantDate.date,
            },
            createdAt: new Date(),
            reasoning: 'Important date approaching. Acknowledging strengthens relationship.',
            impactScore: 6,
            userApprovalRequired: false,
          });
        }
      }

      // Check for relationship maintenance (no contact in 30+ days for key relationships)
      const lastInteraction = relationship.interactionHistory?.[0];
      if (lastInteraction) {
        const daysSince = Math.floor(
          (now.getTime() - new Date(lastInteraction.date).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSince >= 30 && ['mentor', 'close', 'key_contact'].includes(relationship.relationship)) {
          actions.push({
            id: `reconnect-${relationship.personId}`,
            type: 'nudge',
            title: `Reconnect with: ${relationship.name}`,
            description: `${daysSince} days since last interaction`,
            status: 'proposed',
            payload: {
              personId: relationship.personId,
              personName: relationship.name,
              relationship: relationship.relationship,
              daysSinceContact: daysSince,
              lastInteractionType: lastInteraction.type,
            },
            createdAt: new Date(),
            reasoning: 'Key relationship going cold. Proactive outreach maintains connection.',
            impactScore: 5,
            userApprovalRequired: true,
          });
        }
      }
    }

    return actions;
  },

  /**
   * Scan emails for required actions
   */
  scanEmailsForActions(emails: Email[], memory: Memory): ProactiveAction[] {
    const actions: ProactiveAction[] = [];

    // Urgent emails requiring response
    const urgentUnread = emails.filter(e => 
      !e.read && e.requiresResponse && e.sentiment === 'urgent'
    );

    for (const email of urgentUnread) {
      actions.push({
        id: `email-urgent-${email.id}`,
        type: 'reminder',
        title: `Urgent email needs response: ${email.subject}`,
        description: `From: ${email.from}`,
        status: 'proposed',
        payload: {
          emailId: email.id,
          from: email.from,
          subject: email.subject,
          type: 'urgent_response',
        },
        createdAt: new Date(),
        reasoning: 'Urgent email flagged as requiring response',
        impactScore: 9,
        userApprovalRequired: false,
      });
    }

    // Old unread emails requiring response
    const now = new Date();
    const oldRequiringResponse = emails.filter(e => {
      if (e.read || !e.requiresResponse) return false;
      const hoursSinceReceived = (now.getTime() - new Date(e.received).getTime()) / (1000 * 60 * 60);
      return hoursSinceReceived >= 24;
    });

    if (oldRequiringResponse.length > 0) {
      actions.push({
        id: 'email-batch',
        type: 'schedule',
        title: `${oldRequiringResponse.length} emails need responses`,
        description: 'Emails waiting 24+ hours',
        status: 'proposed',
        payload: {
          emailIds: oldRequiringResponse.map(e => e.id),
          count: oldRequiringResponse.length,
        },
        createdAt: new Date(),
        reasoning: 'Multiple emails awaiting response. Batch processing recommended.',
        impactScore: 7,
        userApprovalRequired: true,
      });
    }

    return actions;
  },

  /**
   * Prioritize and limit actions
   */
  prioritizeActions(actions: ProactiveAction[], userProfile: UserProfile): ProactiveAction[] {
    // Remove duplicates
    const unique = actions.filter((a, i, arr) => 
      arr.findIndex(x => x.id === a.id) === i
    );

    // Sort by impact score
    const sorted = unique.sort((a, b) => b.impactScore - a.impactScore);

    // Limit to prevent overwhelm (ADHD-friendly)
    const limit = userProfile.preferences.adhdMode ? 5 : 10;
    
    return sorted.slice(0, limit);
  },

  /**
   * Execute an approved action
   */
  async executeAction(action: ProactiveAction): Promise<{ success: boolean; result: any }> {
    // In real implementation, this would call various APIs
    switch (action.type) {
      case 'auto_task':
        // Would call task creation API
        return { success: true, result: { taskId: `new-task-${Date.now()}` } };
      
      case 'draft_communication':
        // Would generate draft using AI
        return { success: true, result: { draft: 'Generated draft...' } };
      
      case 'prepare_materials':
        // Would generate meeting brief
        return { success: true, result: { brief: 'Meeting brief...' } };
      
      case 'schedule':
        // Would interact with calendar API
        return { success: true, result: { scheduled: true } };
      
      case 'reminder':
      case 'nudge':
        // Would create notification
        return { success: true, result: { notified: true } };
      
      default:
        return { success: false, result: { error: 'Unknown action type' } };
    }
  },
};

/**
 * MESSAGE DRAFTER
 * Generates contextual message drafts
 */
export const messageDrafter = {
  /**
   * Generate a follow-up email draft
   */
  generateFollowUpDraft(
    personName: string,
    context: {
      company?: string;
      lastInteraction?: string;
      relationship?: RelationshipMemory;
      purpose: 'check_in' | 'follow_up' | 're_engagement' | 'overdue_follow_up';
      daysOverdue?: number;
    }
  ): string {
    const firstName = personName.split(' ')[0];
    
    switch (context.purpose) {
      case 'check_in':
        return `Hi ${firstName},

Hope you're doing well! I wanted to check in and see how things are going${context.company ? ` at ${context.company}` : ''}.

[Add personal note or relevant update]

Let me know if there's anything I can help with.

Best,
[Your name]`;

      case 'follow_up':
        return `Hi ${firstName},

Following up on our previous conversation. Wanted to see if you had any questions or if there's anything else you need from me.

[Reference specific topic if relevant]

Looking forward to hearing from you.

Best,
[Your name]`;

      case 're_engagement':
        return `Hi ${firstName},

It's been a while since we connected and I wanted to reach out. I hope everything is going well${context.company ? ` at ${context.company}` : ''}.

[Add value - share relevant article, insight, or offer]

Would love to catch up when you have a moment.

Best,
[Your name]`;

      case 'overdue_follow_up':
        return `Hi ${firstName},

I apologize for the delay in getting back to you - things got away from me, but I wanted to make sure to follow up.

[Address original topic]

Please let me know if you're still interested in connecting. I'm happy to work around your schedule.

Best,
[Your name]`;

      default:
        return `Hi ${firstName},

[Your message here]

Best,
[Your name]`;
    }
  },

  /**
   * Generate a meeting prep brief
   */
  generateMeetingBrief(
    eventTitle: string,
    attendees: string[],
    attendeeInfo: (RelationshipMemory | undefined)[]
  ): string {
    let brief = `# Meeting Prep: ${eventTitle}\n\n`;
    
    brief += `## Attendees\n`;
    for (let i = 0; i < attendees.length; i++) {
      const name = attendees[i];
      const info = attendeeInfo[i];
      
      if (info) {
        brief += `- **${name}** (${info.relationship})\n`;
        if (info.communicationStyle) {
          brief += `  - Communication style: ${info.communicationStyle}\n`;
        }
        if (info.preferences && Object.keys(info.preferences).length > 0) {
          brief += `  - Notes: ${Object.values(info.preferences).join(', ')}\n`;
        }
      } else {
        brief += `- ${name}\n`;
      }
    }
    
    brief += `\n## Suggested Talking Points\n`;
    brief += `- [ ] Opening / rapport building\n`;
    brief += `- [ ] Main agenda items\n`;
    brief += `- [ ] Questions to ask\n`;
    brief += `- [ ] Next steps to propose\n`;
    
    brief += `\n## Notes\n`;
    brief += `[Add your notes here]\n`;
    
    return brief;
  },
};
