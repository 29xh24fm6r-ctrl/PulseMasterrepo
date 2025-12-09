// Pulse OS Brain Loader
// Fetches knowledge modules from GitHub repository (supports private repos)

import { MentorId } from '@/lib/philosophy/types';

const GITHUB_REPO = '29xh24fm6r-ctrl/Pulse-OS-Brain';
const GITHUB_BRANCH = 'main';
const GITHUB_API_BASE = `https://api.github.com/repos/${GITHUB_REPO}/contents`;

const MODULES = {
  communication: ['communication-patterns.md', 'relationship-intelligence.md', 'conflict-navigation.md', 'meeting-prep.md', 'relationship-repair.md', 'reputation-management.md'],
  'identity-emotional': ['persona-matrix.md', 'emotional-stability.md', 'emotional-pattern-detection.md', 'burnout-prevention.md', 'confidence-engine.md', 'creativity-vision.md', 'habit-recovery.md', 'identity-evolution.md', 'life-navigation.md', 'motivation-engine.md', 'power-navigation.md'],
  'sales-deals': ['crm-pipeline-rules.md', 'deal-coaching.md', 'follow-up-engine.md', 'negotiation-engine.md', 'objection-handling.md', 'sales-influence-core.md', 'stakeholder-mapping.md', 'underwriting-prep.md'],
  'xp-system': ['daily-rhythm.md', 'micro-missions.md', 'onboarding.md', 'xp-engine.md'],
  mentors: ['mentor-marcus-aurelius.md', 'mentor-seneca.md', 'mentor-epictetus.md', 'mentor-musashi.md', 'mentor-sun-tzu.md', 'mentor-lao-tzu.md', 'mentor-zen-master.md', 'mentor-buddha.md', 'mentor-covey.md', 'mentor-goggins.md'],
};

const MENTOR_FILES: Record<string, string> = {
  'marcus_aurelius': 'mentor-marcus-aurelius.md',
  'seneca': 'mentor-seneca.md',
  'epictetus': 'mentor-epictetus.md',
  'musashi': 'mentor-musashi.md',
  'sun_tzu': 'mentor-sun-tzu.md',
  'lao_tzu': 'mentor-lao-tzu.md',
  'zen_master': 'mentor-zen-master.md',
  'buddha': 'mentor-buddha.md',
  'covey': 'mentor-covey.md',
  'goggins': 'mentor-goggins.md',
};

const moduleCache: Map<string, { content: string; loadedAt: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000;

async function fetchFile(path: string): Promise<string> {
  const cached = moduleCache.get(path);
  if (cached && Date.now() - cached.loadedAt < CACHE_DURATION) return cached.content;
  
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    console.error('GITHUB_TOKEN not set');
    return '';
  }
  
  const url = `${GITHUB_API_BASE}/${path}?ref=${GITHUB_BRANCH}`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.v3.raw',
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'Pulse-OS-App',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      cache: 'no-store',
    });
    
    if (!response.ok) {
      console.error(`Failed to fetch ${path}: ${response.status}`);
      return '';
    }
    
    const content = await response.text();
    moduleCache.set(path, { content, loadedAt: Date.now() });
    return content;
  } catch (error) {
    console.error(`Error fetching ${path}:`, error);
    return '';
  }
}

export async function loadKernel(): Promise<string> { return fetchFile('KERNEL.md'); }
export async function loadModule(category: keyof typeof MODULES, filename: string): Promise<string> { return fetchFile(filename); }
export async function loadModulesByCategory(category: keyof typeof MODULES): Promise<string> {
  const contents = await Promise.all(MODULES[category].map(file => fetchFile(file)));
  return contents.filter(Boolean).join('\n\n---\n\n');
}
export async function loadAllModules(): Promise<string> {
  const allContents: string[] = [];
  const kernel = await loadKernel();
  if (kernel) allContents.push(kernel);
  for (const category of Object.keys(MODULES) as Array<keyof typeof MODULES>) {
    if (category === 'mentors') continue;
    const categoryContent = await loadModulesByCategory(category);
    if (categoryContent) allContents.push(categoryContent);
  }
  return allContents.join('\n\n---\n\n');
}
export async function loadMentor(mentorId: MentorId | string): Promise<string> {
  const filename = MENTOR_FILES[mentorId];
  if (!filename) { console.error(`Unknown mentor ID: ${mentorId}`); return ''; }
  return fetchFile(filename);
}
export async function loadMentorWithKernel(mentorId: MentorId | string): Promise<string> {
  const [kernel, mentorBrain] = await Promise.all([loadKernel(), loadMentor(mentorId)]);
  if (!mentorBrain) { console.error(`Failed to load mentor brain for: ${mentorId}`); return kernel || ''; }
  return [kernel, mentorBrain].filter(Boolean).join('\n\n---\n\n');
}
export async function loadMentorWithContext(mentorId: MentorId | string, additionalModules: Array<keyof typeof MODULES> = []): Promise<string> {
  const contents: string[] = [];
  const kernel = await loadKernel();
  if (kernel) contents.push(kernel);
  const mentorBrain = await loadMentor(mentorId);
  if (mentorBrain) contents.push(mentorBrain);
  for (const category of additionalModules) {
    if (category === 'mentors') continue;
    const categoryContent = await loadModulesByCategory(category);
    if (categoryContent) contents.push(categoryContent);
  }
  return contents.join('\n\n---\n\n');
}
export async function loadAllMentors(): Promise<string> { return loadModulesByCategory('mentors'); }
export function isValidMentorId(mentorId: string): boolean { return mentorId in MENTOR_FILES; }
export function getAvailableMentorIds(): string[] { return Object.keys(MENTOR_FILES); }
export function detectRelevantModules(message: string): Array<keyof typeof MODULES> {
  const lowerMessage = message.toLowerCase();
  const relevant: Array<keyof typeof MODULES> = [];
  if (lowerMessage.includes('email') || lowerMessage.includes('message') || lowerMessage.includes('write') || lowerMessage.includes('communicate') || lowerMessage.includes('meeting') || lowerMessage.includes('conflict') || lowerMessage.includes('relationship')) relevant.push('communication');
  if (lowerMessage.includes('feel') || lowerMessage.includes('stress') || lowerMessage.includes('overwhelm') || lowerMessage.includes('anxious') || lowerMessage.includes('confidence') || lowerMessage.includes('habit') || lowerMessage.includes('burnout') || lowerMessage.includes('motivation') || lowerMessage.includes('stuck')) relevant.push('identity-emotional');
  if (lowerMessage.includes('deal') || lowerMessage.includes('sale') || lowerMessage.includes('client') || lowerMessage.includes('pipeline') || lowerMessage.includes('follow up') || lowerMessage.includes('negotiate') || lowerMessage.includes('loan') || lowerMessage.includes('borrower')) relevant.push('sales-deals');
  if (lowerMessage.includes('xp') || lowerMessage.includes('points') || lowerMessage.includes('level') || lowerMessage.includes('morning') || lowerMessage.includes('routine') || lowerMessage.includes('daily') || lowerMessage.includes('mission')) relevant.push('xp-system');
  if (relevant.length === 0) relevant.push('identity-emotional');
  return relevant;
}
export async function loadRelevantModules(message: string): Promise<string> {
  const relevant = detectRelevantModules(message);
  const contents: string[] = [];
  const kernel = await loadKernel();
  if (kernel) contents.push(kernel);
  for (const category of relevant) {
    const categoryContent = await loadModulesByCategory(category);
    if (categoryContent) contents.push(categoryContent);
  }
  return contents.join('\n\n---\n\n');
}
export { MODULES, MENTOR_FILES };
