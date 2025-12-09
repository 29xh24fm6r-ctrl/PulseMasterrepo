// Skill Tree Definitions for Philosophy Dojo

export type SkillState = 'locked' | 'available' | 'in_progress' | 'mastered';

export interface Skill {
  id: string;
  name: string;
  description: string;
  tier: number; // 1-4, where 4 is master skill
  prerequisites: string[]; // skill IDs required before this unlocks
  xpReward: number;
  trainingPrompt: string; // The challenge/question for training
  masteryRequirement: string; // What user must demonstrate
  icon: string;
}

export interface SkillTree {
  id: string;
  name: string;
  philosophy: string;
  mentorIds: string[]; // Which mentors teach this tree
  description: string;
  icon: string;
  color: string; // For UI theming
  skills: Skill[];
}

export interface UserSkillProgress {
  odId: string;
  odllId: string;
  state: SkillState;
  startedAt?: string;
  masteredAt?: string;
  attempts: number;
}

// ============================================
// STOICISM SKILL TREE
// ============================================

export const STOICISM_TREE: SkillTree = {
  id: 'stoicism',
  name: 'The Stoic Path',
  philosophy: 'Stoicism',
  mentorIds: ['marcus_aurelius', 'seneca', 'epictetus'],
  description: 'Master your mind, accept what you cannot change, and find tranquility within.',
  icon: '🏛️',
  color: '#3B82F6', // blue
  skills: [
    // Tier 1 - Foundations
    {
      id: 'dichotomy_of_control',
      name: 'Dichotomy of Control',
      description: 'Distinguish between what is in your control and what is not.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'Describe a current frustration. Separate what you can control from what you cannot.',
      masteryRequirement: 'Demonstrate clear separation of controllables vs uncontrollables',
      icon: '⚖️',
    },
    {
      id: 'morning_reflection',
      name: 'Morning Reflection',
      description: 'Begin each day with intentional contemplation of challenges ahead.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'What challenges might you face today? How will you respond virtuously to each?',
      masteryRequirement: 'Articulate potential challenges and virtuous responses',
      icon: '🌅',
    },
    // Tier 2 - Development
    {
      id: 'negative_visualization',
      name: 'Negative Visualization',
      description: 'Contemplate loss to appreciate what you have and prepare for adversity.',
      tier: 2,
      prerequisites: ['dichotomy_of_control'],
      xpReward: 75,
      trainingPrompt: 'Imagine losing something precious to you. How does this shift your perspective on its current presence?',
      masteryRequirement: 'Show genuine shift in gratitude and preparedness',
      icon: '👁️',
    },
    {
      id: 'amor_fati',
      name: 'Amor Fati',
      description: 'Love your fate. Embrace everything that happens as necessary.',
      tier: 2,
      prerequisites: ['morning_reflection'],
      xpReward: 75,
      trainingPrompt: 'Describe a past setback. How can you view it as essential to who you are today?',
      masteryRequirement: 'Reframe setback as gift or teacher',
      icon: '🔥',
    },
    // Tier 3 - Advanced
    {
      id: 'view_from_above',
      name: 'View from Above',
      description: 'See your problems from a cosmic perspective to gain clarity.',
      tier: 3,
      prerequisites: ['negative_visualization', 'amor_fati'],
      xpReward: 100,
      trainingPrompt: 'Take your biggest current worry. Now zoom out to see it from space, from the perspective of all human history. What remains?',
      masteryRequirement: 'Achieve genuine perspective shift on current concerns',
      icon: '🌍',
    },
    {
      id: 'memento_mori',
      name: 'Memento Mori',
      description: 'Remember death. Use mortality as a lens for what truly matters.',
      tier: 3,
      prerequisites: ['negative_visualization', 'amor_fati'],
      xpReward: 100,
      trainingPrompt: 'If you had one month to live, what would you do differently starting today?',
      masteryRequirement: 'Identify concrete changes based on mortality awareness',
      icon: '💀',
    },
    // Tier 4 - Mastery
    {
      id: 'inner_citadel',
      name: 'The Inner Citadel',
      description: 'Build an unshakeable fortress within. Nothing external can disturb your peace.',
      tier: 4,
      prerequisites: ['view_from_above', 'memento_mori'],
      xpReward: 200,
      trainingPrompt: 'Describe how you would maintain equanimity if you lost your job, health, and reputation tomorrow.',
      masteryRequirement: 'Demonstrate genuine inner stability independent of externals',
      icon: '🏰',
    },
  ],
};

// ============================================
// SAMURAI SKILL TREE
// ============================================

export const SAMURAI_TREE: SkillTree = {
  id: 'samurai',
  name: 'The Way of the Sword',
  philosophy: 'Bushido',
  mentorIds: ['musashi', 'sun_tzu'],
  description: 'Master strategy, decisive action, and the warrior mindset.',
  icon: '⚔️',
  color: '#EF4444', // red
  skills: [
    // Tier 1
    {
      id: 'single_focus',
      name: 'Single Focus',
      description: 'Cut through distraction. One target, complete attention.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'What is the ONE thing that matters most right now? Eliminate all else from your mind.',
      masteryRequirement: 'Identify single priority with clarity',
      icon: '🎯',
    },
    {
      id: 'the_void',
      name: 'The Void',
      description: 'Empty your mind of preconceptions. See what is, not what you expect.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'Describe a situation where your assumptions led you astray. What would emptiness have shown you?',
      masteryRequirement: 'Recognize how preconceptions clouded judgment',
      icon: '🌑',
    },
    // Tier 2
    {
      id: 'mushin',
      name: 'Mushin (No-Mind)',
      description: 'Act without hesitation. The mind that is no mind.',
      tier: 2,
      prerequisites: ['single_focus'],
      xpReward: 75,
      trainingPrompt: 'What decision have you been overthinking? Make it now. What did you choose?',
      masteryRequirement: 'Demonstrate decisive action without paralysis',
      icon: '💨',
    },
    {
      id: 'timing',
      name: 'Timing',
      description: 'Know when to strike. Not too early, not too late.',
      tier: 2,
      prerequisites: ['the_void'],
      xpReward: 75,
      trainingPrompt: 'Describe a situation requiring patience. How will you know the right moment to act?',
      masteryRequirement: 'Articulate timing indicators for pending action',
      icon: '⏱️',
    },
    // Tier 3
    {
      id: 'two_swords',
      name: 'Two Swords',
      description: 'Use everything at your disposal. Hold nothing in reserve.',
      tier: 3,
      prerequisites: ['mushin', 'timing'],
      xpReward: 100,
      trainingPrompt: 'What resources, skills, or allies are you not fully utilizing? How will you deploy them?',
      masteryRequirement: 'Identify underutilized resources and deployment plan',
      icon: '⚔️',
    },
    {
      id: 'crossing_at_a_ford',
      name: 'Crossing at a Ford',
      description: 'Find the shallow point. Never force what can be flowed around.',
      tier: 3,
      prerequisites: ['mushin', 'timing'],
      xpReward: 100,
      trainingPrompt: 'Where are you forcing your way through? What would be the path of least resistance?',
      masteryRequirement: 'Identify easier path to same goal',
      icon: '🌊',
    },
    // Tier 4
    {
      id: 'way_of_strategy',
      name: 'The Way of Strategy',
      description: 'See the entire battlefield. Move before your opponent knows the game has begun.',
      tier: 4,
      prerequisites: ['two_swords', 'crossing_at_a_ford'],
      xpReward: 200,
      trainingPrompt: 'Map your current "battlefield" - all players, their motivations, and how you will position yourself to win before engagement.',
      masteryRequirement: 'Comprehensive strategic analysis with positioning plan',
      icon: '🗡️',
    },
  ],
};

// ============================================
// TAOIST SKILL TREE
// ============================================

export const TAOIST_TREE: SkillTree = {
  id: 'taoism',
  name: 'The Way',
  philosophy: 'Taoism',
  mentorIds: ['lao_tzu'],
  description: 'Flow like water. The soft overcomes the hard.',
  icon: '☯️',
  color: '#10B981', // green
  skills: [
    // Tier 1
    {
      id: 'wu_wei',
      name: 'Wu Wei',
      description: 'Effortless action. Achieve by not forcing.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'Where are you pushing too hard? What would happen if you simply stopped forcing?',
      masteryRequirement: 'Identify area of over-effort and release plan',
      icon: '🌊',
    },
    {
      id: 'simplicity',
      name: 'Simplicity',
      description: 'Return to the uncarved block. Strip away the unnecessary.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'What complexity in your life can be eliminated? Name three things to release.',
      masteryRequirement: 'Identify concrete simplifications',
      icon: '🪵',
    },
    // Tier 2
    {
      id: 'soft_overcomes_hard',
      name: 'Soft Overcomes Hard',
      description: 'Water wears away stone. Yield to conquer.',
      tier: 2,
      prerequisites: ['wu_wei'],
      xpReward: 75,
      trainingPrompt: 'Describe a conflict where force has failed. How could softness succeed?',
      masteryRequirement: 'Propose soft approach to hard problem',
      icon: '💧',
    },
    {
      id: 'balance',
      name: 'Balance',
      description: 'Yin and yang. Hold opposites without choosing.',
      tier: 2,
      prerequisites: ['simplicity'],
      xpReward: 75,
      trainingPrompt: 'What opposing forces are you trying to choose between? How can both be true?',
      masteryRequirement: 'Integrate apparent opposites',
      icon: '☯️',
    },
    // Tier 3
    {
      id: 'uncarved_block',
      name: 'The Uncarved Block',
      description: 'Return to original nature. Before conditioning, who were you?',
      tier: 3,
      prerequisites: ['soft_overcomes_hard', 'balance'],
      xpReward: 100,
      trainingPrompt: 'Before society told you who to be, what did you naturally love? What has been carved away?',
      masteryRequirement: 'Connect with pre-conditioned self',
      icon: '🌲',
    },
    {
      id: 'paradox',
      name: 'Embracing Paradox',
      description: 'The Tao that can be named is not the eternal Tao.',
      tier: 3,
      prerequisites: ['soft_overcomes_hard', 'balance'],
      xpReward: 100,
      trainingPrompt: 'What truth in your life seems contradictory yet feels right? Sit with it without resolving.',
      masteryRequirement: 'Accept paradox without forcing resolution',
      icon: '🔄',
    },
    // Tier 4
    {
      id: 'the_tao',
      name: 'The Tao',
      description: 'Be like water. Take the shape of any container yet remain yourself.',
      tier: 4,
      prerequisites: ['uncarved_block', 'paradox'],
      xpReward: 200,
      trainingPrompt: 'In your current challenge, how can you be formless yet effective? Flow yet purposeful?',
      masteryRequirement: 'Demonstrate water-like adaptation while maintaining essence',
      icon: '🌀',
    },
  ],
};

// ============================================
// ZEN SKILL TREE
// ============================================

export const ZEN_TREE: SkillTree = {
  id: 'zen',
  name: 'Direct Pointing',
  philosophy: 'Zen Buddhism',
  mentorIds: ['zen_master', 'buddha'],
  description: 'This moment. Just this. What is it?',
  icon: '🧘',
  color: '#8B5CF6', // purple
  skills: [
    // Tier 1
    {
      id: 'beginner_mind',
      name: "Beginner's Mind",
      description: 'See everything as if for the first time.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'Look at something familiar as if you have never seen it. What do you notice?',
      masteryRequirement: 'Describe fresh perception of familiar thing',
      icon: '👶',
    },
    {
      id: 'present_moment',
      name: 'Present Moment',
      description: 'There is only now. Past and future are illusions.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'For 60 seconds, notice only what is happening RIGHT NOW. What is here?',
      masteryRequirement: 'Describe pure present-moment awareness',
      icon: '⏰',
    },
    // Tier 2
    {
      id: 'sitting',
      name: 'Just Sitting',
      description: 'Zazen. Sit without purpose. Not even to become enlightened.',
      tier: 2,
      prerequisites: ['present_moment'],
      xpReward: 75,
      trainingPrompt: 'Sit for 5 minutes with no goal. What happened when you stopped trying?',
      masteryRequirement: 'Report experience of goalless sitting',
      icon: '🪷',
    },
    {
      id: 'not_knowing',
      name: 'Not Knowing',
      description: 'The wisdom of uncertainty. "I don\'t know" is an answer.',
      tier: 2,
      prerequisites: ['beginner_mind'],
      xpReward: 75,
      trainingPrompt: 'What are you pretending to know that you actually don\'t? Say "I don\'t know."',
      masteryRequirement: 'Acknowledge genuine uncertainty',
      icon: '❓',
    },
    // Tier 3
    {
      id: 'koan',
      name: 'Working with Koans',
      description: 'What is the sound of one hand clapping? Break the rational mind.',
      tier: 3,
      prerequisites: ['sitting', 'not_knowing'],
      xpReward: 100,
      trainingPrompt: 'Who were you before your parents were born? Sit with this. What arises?',
      masteryRequirement: 'Engage with paradox beyond rational thought',
      icon: '🔔',
    },
    {
      id: 'ordinary_mind',
      name: 'Ordinary Mind',
      description: 'Enlightenment is eating breakfast. The sacred in the mundane.',
      tier: 3,
      prerequisites: ['sitting', 'not_knowing'],
      xpReward: 100,
      trainingPrompt: 'Describe a mundane activity you did today as if it were a sacred practice.',
      masteryRequirement: 'Find depth in ordinary activity',
      icon: '🍵',
    },
    // Tier 4
    {
      id: 'satori',
      name: 'Satori',
      description: 'Sudden awakening. The gateless gate.',
      tier: 4,
      prerequisites: ['koan', 'ordinary_mind'],
      xpReward: 200,
      trainingPrompt: 'Right now, in this moment, what is missing?',
      masteryRequirement: 'Direct pointing at completeness of this moment',
      icon: '💎',
    },
  ],
};

// ============================================
// DISCIPLINE SKILL TREE
// ============================================

export const DISCIPLINE_TREE: SkillTree = {
  id: 'discipline',
  name: 'Callus Your Mind',
  philosophy: 'Mental Toughness',
  mentorIds: ['goggins'],
  description: 'No excuses. Embrace the suck. Stay hard.',
  icon: '💀',
  color: '#F59E0B', // amber
  skills: [
    // Tier 1
    {
      id: 'accountability_mirror',
      name: 'Accountability Mirror',
      description: 'Face the truth about yourself. No lies, no excuses.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'What lie are you telling yourself about why you can\'t do something? Name it.',
      masteryRequirement: 'Identify self-deception honestly',
      icon: '🪞',
    },
    {
      id: 'taking_souls',
      name: 'Taking Souls',
      description: 'When you think you\'re done, you\'re only at 40%.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'What did you quit on recently? You have 60% left. What will you do with it?',
      masteryRequirement: 'Identify reserve capacity and commitment to use it',
      icon: '👊',
    },
    // Tier 2
    {
      id: 'cookie_jar',
      name: 'The Cookie Jar',
      description: 'Remember your past victories. Draw strength from what you\'ve survived.',
      tier: 2,
      prerequisites: ['accountability_mirror'],
      xpReward: 75,
      trainingPrompt: 'List 5 hard things you\'ve overcome. These are your cookies. Which will fuel you today?',
      masteryRequirement: 'Build personal inventory of past victories',
      icon: '🍪',
    },
    {
      id: 'embrace_the_suck',
      name: 'Embrace the Suck',
      description: 'Suffering is the path. Stop running from discomfort.',
      tier: 2,
      prerequisites: ['taking_souls'],
      xpReward: 75,
      trainingPrompt: 'What are you avoiding because it\'s uncomfortable? Commit to doing it today.',
      masteryRequirement: 'Commit to specific uncomfortable action',
      icon: '🔥',
    },
    // Tier 3
    {
      id: 'callused_mind',
      name: 'Callused Mind',
      description: 'Pain builds armor. Each hardship makes you more unbreakable.',
      tier: 3,
      prerequisites: ['cookie_jar', 'embrace_the_suck'],
      xpReward: 100,
      trainingPrompt: 'What recent failure can you reframe as mental callus? How did it make you stronger?',
      masteryRequirement: 'Transform failure into strength',
      icon: '🛡️',
    },
    {
      id: 'uncommon',
      name: 'Uncommon Amongst Uncommon',
      description: 'When everyone else quits, keep going. Separate yourself.',
      tier: 3,
      prerequisites: ['cookie_jar', 'embrace_the_suck'],
      xpReward: 100,
      trainingPrompt: 'Where is "good enough" holding you back? What would uncommon look like?',
      masteryRequirement: 'Define standard above the norm and commit',
      icon: '⭐',
    },
    // Tier 4
    {
      id: 'stay_hard',
      name: 'Stay Hard',
      description: 'This is a lifestyle, not a moment. Every day, earn your name.',
      tier: 4,
      prerequisites: ['callused_mind', 'uncommon'],
      xpReward: 200,
      trainingPrompt: 'Design your non-negotiable daily discipline. What will you do EVERY DAY no matter what?',
      masteryRequirement: 'Commit to specific daily discipline',
      icon: '💀',
    },
  ],
};

// ============================================
// EFFECTIVENESS SKILL TREE
// ============================================

export const EFFECTIVENESS_TREE: SkillTree = {
  id: 'effectiveness',
  name: '7 Habits',
  philosophy: 'Principle-Centered Living',
  mentorIds: ['covey'],
  description: 'Begin with the end in mind. Put first things first.',
  icon: '📘',
  color: '#06B6D4', // cyan
  skills: [
    // Tier 1
    {
      id: 'be_proactive',
      name: 'Be Proactive',
      description: 'Choose your response. You are not a victim of circumstance.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'Where are you being reactive instead of proactive? What response will you choose instead?',
      masteryRequirement: 'Identify reactive pattern and proactive alternative',
      icon: '🎯',
    },
    {
      id: 'begin_with_end',
      name: 'Begin with the End in Mind',
      description: 'Define your destination before you start walking.',
      tier: 1,
      prerequisites: [],
      xpReward: 50,
      trainingPrompt: 'What do you want people to say at your funeral? How does today align with that vision?',
      masteryRequirement: 'Articulate life vision and today\'s alignment',
      icon: '🏁',
    },
    // Tier 2
    {
      id: 'first_things_first',
      name: 'Put First Things First',
      description: 'Important over urgent. Quadrant II living.',
      tier: 2,
      prerequisites: ['be_proactive', 'begin_with_end'],
      xpReward: 75,
      trainingPrompt: 'What important-but-not-urgent task are you neglecting? Schedule it now.',
      masteryRequirement: 'Identify and schedule Quadrant II activity',
      icon: '📊',
    },
    {
      id: 'think_win_win',
      name: 'Think Win-Win',
      description: 'Abundance mentality. Success is not zero-sum.',
      tier: 2,
      prerequisites: ['be_proactive'],
      xpReward: 75,
      trainingPrompt: 'Describe a current conflict. How could both parties win?',
      masteryRequirement: 'Design win-win solution to real conflict',
      icon: '🤝',
    },
    // Tier 3
    {
      id: 'seek_first_to_understand',
      name: 'Seek First to Understand',
      description: 'Empathic listening. Diagnose before you prescribe.',
      tier: 3,
      prerequisites: ['think_win_win'],
      xpReward: 100,
      trainingPrompt: 'Who do you need to understand better? What question could you ask them with genuine curiosity?',
      masteryRequirement: 'Formulate empathic questions for specific person',
      icon: '👂',
    },
    {
      id: 'synergize',
      name: 'Synergize',
      description: 'Creative cooperation. The whole is greater than the sum of parts.',
      tier: 3,
      prerequisites: ['think_win_win', 'first_things_first'],
      xpReward: 100,
      trainingPrompt: 'Who could you combine forces with to create something neither could alone?',
      masteryRequirement: 'Identify synergy opportunity',
      icon: '🔗',
    },
    // Tier 4
    {
      id: 'sharpen_the_saw',
      name: 'Sharpen the Saw',
      description: 'Continuous renewal. Physical, mental, social, spiritual.',
      tier: 4,
      prerequisites: ['seek_first_to_understand', 'synergize'],
      xpReward: 200,
      trainingPrompt: 'Rate yourself 1-10 in physical, mental, social, spiritual. Which needs attention? What\'s one action?',
      masteryRequirement: 'Assess all four dimensions and commit to renewal',
      icon: '🪚',
    },
  ],
};

// ============================================
// ALL SKILL TREES
// ============================================

export const ALL_SKILL_TREES: SkillTree[] = [
  STOICISM_TREE,
  SAMURAI_TREE,
  TAOIST_TREE,
  ZEN_TREE,
  DISCIPLINE_TREE,
  EFFECTIVENESS_TREE,
];

export function getSkillTreeById(id: string): SkillTree | undefined {
  return ALL_SKILL_TREES.find(tree => tree.id === id);
}

export function getSkillById(treeId: string, skillId: string): Skill | undefined {
  const tree = getSkillTreeById(treeId);
  return tree?.skills.find(skill => skill.id === skillId);
}

export function getSkillTreeForMentor(mentorId: string): SkillTree | undefined {
  return ALL_SKILL_TREES.find(tree => tree.mentorIds.includes(mentorId));
}

export function getAvailableSkills(tree: SkillTree, masteredSkills: string[]): Skill[] {
  return tree.skills.filter(skill => {
    // Already mastered
    if (masteredSkills.includes(skill.id)) return false;
    // Check prerequisites
    return skill.prerequisites.every(prereq => masteredSkills.includes(prereq));
  });
}

export function getLockedSkills(tree: SkillTree, masteredSkills: string[]): Skill[] {
  return tree.skills.filter(skill => {
    if (masteredSkills.includes(skill.id)) return false;
    return !skill.prerequisites.every(prereq => masteredSkills.includes(prereq));
  });
}
