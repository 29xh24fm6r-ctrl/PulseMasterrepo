// Life Chapter Builder
// lib/cortex/longitudinal/chapter-builder.ts

import { LifeEvent, LifeChapter } from "./types";

/**
 * Build life chapters from chronological events
 * Groups events into meaningful "chapters" using clustering
 */
export function buildLifeChapters(events: LifeEvent[]): LifeChapter[] {
  if (events.length === 0) return [];

  // Sort events chronologically
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const chapters: LifeChapter[] = [];
  let currentChapter: LifeChapter | null = null;
  let chapterStartTime = new Date(sortedEvents[0].timestamp);

  // Analyze events for chapter boundaries
  for (let i = 0; i < sortedEvents.length; i++) {
    const event = sortedEvents[i];
    const eventTime = new Date(event.timestamp);
    const timeSinceStart = eventTime.getTime() - chapterStartTime.getTime();
    const daysSinceStart = timeSinceStart / (1000 * 60 * 60 * 24);

    // Check for chapter boundary triggers
    const shouldStartNewChapter =
      !currentChapter ||
      detectChapterBoundary(
        event,
        sortedEvents.slice(Math.max(0, i - 10), i),
        daysSinceStart
      );

    if (shouldStartNewChapter && currentChapter) {
      // Finalize current chapter
      currentChapter.end = sortedEvents[i - 1].timestamp;
      currentChapter = finalizeChapter(currentChapter, sortedEvents);
      chapters.push(currentChapter);

      // Start new chapter
      chapterStartTime = eventTime;
      currentChapter = {
        id: `chapter_${chapters.length + 1}`,
        title: generateChapterTitle(event, sortedEvents.slice(0, i)),
        start: event.timestamp,
        keyEvents: [event.id],
        domainFocus: [event.domain],
      };
    } else if (!currentChapter) {
      // First chapter
      currentChapter = {
        id: "chapter_1",
        title: generateChapterTitle(event, []),
        start: event.timestamp,
        keyEvents: [event.id],
        domainFocus: [event.domain],
      };
    } else {
      // Add event to current chapter
      currentChapter.keyEvents?.push(event.id);
      if (!currentChapter.domainFocus?.includes(event.domain)) {
        currentChapter.domainFocus?.push(event.domain);
      }
    }
  }

  // Finalize last chapter
  if (currentChapter) {
    currentChapter.end = sortedEvents[sortedEvents.length - 1].timestamp;
    currentChapter = finalizeChapter(currentChapter, sortedEvents);
    chapters.push(currentChapter);
  }

  return chapters;
}

/**
 * Detect if an event should trigger a new chapter
 */
function detectChapterBoundary(
  event: LifeEvent,
  recentEvents: LifeEvent[],
  daysSinceStart: number
): boolean {
  // Boundary 1: Emotion shift (significant change)
  if (event.emotion && recentEvents.length > 0) {
    const recentEmotions = recentEvents
      .filter((e) => e.emotion)
      .map((e) => e.emotion!);
    if (recentEmotions.length > 0) {
      const dominantRecent = getDominantEmotion(recentEmotions);
      if (dominantRecent !== event.emotion && event.intensity && event.intensity > 0.7) {
        return true; // Strong emotion shift
      }
    }
  }

  // Boundary 2: Project boundaries (new project starts)
  if (event.type === "project_start" || event.type === "project_completed") {
    return true;
  }

  // Boundary 3: Relationship events (major relationship changes)
  if (
    event.domain === "relationships" &&
    (event.type === "relationship_start" ||
      event.type === "relationship_end" ||
      event.type === "major_conflict")
  ) {
    return true;
  }

  // Boundary 4: High-stress periods (stress spike after calm)
  if (event.emotion === "stressed" && event.intensity && event.intensity > 0.8) {
    const recentStress = recentEvents.filter(
      (e) => e.emotion === "stressed" && e.intensity && e.intensity > 0.7
    );
    if (recentStress.length === 0) {
      return true; // Stress spike after calm period
    }
  }

  // Boundary 5: Life transitions (major life events)
  if (
    event.type === "life_transition" ||
    event.type === "career_change" ||
    event.type === "relocation"
  ) {
    return true;
  }

  // Boundary 6: Time-based (chapters longer than 90 days)
  if (daysSinceStart > 90) {
    return true;
  }

  return false;
}

/**
 * Finalize a chapter with summary and themes
 */
function finalizeChapter(
  chapter: LifeChapter,
  allEvents: LifeEvent[]
): LifeChapter {
  const chapterEvents = allEvents.filter((e) =>
    chapter.keyEvents?.includes(e.id)
  );

  // Determine dominant emotion
  const emotions = chapterEvents
    .filter((e) => e.emotion)
    .map((e) => e.emotion!);
  chapter.dominantEmotion = getDominantEmotion(emotions);

  // Extract major themes
  const domainCounts = new Map<LifeDomain, number>();
  for (const event of chapterEvents) {
    domainCounts.set(event.domain, (domainCounts.get(event.domain) || 0) + 1);
  }

  const topDomains = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([domain]) => domain);

  chapter.majorThemes = topDomains.map((d) => d);
  chapter.domainFocus = topDomains;

  // Generate narrative summary
  chapter.narrativeSummary = generateNarrativeSummary(chapter, chapterEvents);

  return chapter;
}

/**
 * Generate chapter title from events
 */
function generateChapterTitle(
  firstEvent: LifeEvent,
  previousEvents: LifeEvent[]
): string {
  // Use domain + emotion or type
  if (firstEvent.domain === "work" && firstEvent.type.includes("project")) {
    return `Project Focus: ${firstEvent.description.substring(0, 30)}`;
  }
  if (firstEvent.domain === "relationships") {
    return `Relationship Phase: ${firstEvent.type}`;
  }
  if (firstEvent.emotion) {
    return `${firstEvent.emotion.charAt(0).toUpperCase() + firstEvent.emotion.slice(1)} Period`;
  }
  return `${firstEvent.domain.charAt(0).toUpperCase() + firstEvent.domain.slice(1)} Chapter`;
}

/**
 * Generate narrative summary for a chapter
 */
function generateNarrativeSummary(
  chapter: LifeChapter,
  events: LifeEvent[]
): string {
  const domainFocus = chapter.domainFocus || [];
  const emotion = chapter.dominantEmotion || "neutral";
  const eventCount = events.length;

  if (domainFocus.length === 1) {
    return `A ${domainFocus[0]}-focused period with ${eventCount} significant events, characterized by ${emotion} emotional tone.`;
  } else if (domainFocus.length > 1) {
    return `A multi-domain period spanning ${domainFocus.join(", ")}, with ${eventCount} events and ${emotion} emotional undertones.`;
  }

  return `A period with ${eventCount} significant life events.`;
}

/**
 * Get dominant emotion from list
 */
function getDominantEmotion(emotions: string[]): string | undefined {
  if (emotions.length === 0) return undefined;

  const counts = new Map<string, number>();
  for (const emotion of emotions) {
    counts.set(emotion, (counts.get(emotion) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];
}



