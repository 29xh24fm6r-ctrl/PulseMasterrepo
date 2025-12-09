import { NextRequest, NextResponse } from "next/server";
import { ALL_SKILL_TREES, getSkillTreeById, Skill, SkillTree } from "@/lib/philosophy/skill-trees";

interface DailyChallenge {
  id: string;
  type: 'skill_training' | 'mentor_session' | 'reflection';
  title: string;
  description: string;
  timeEstimate: string;
  xpReward: number;
  skill?: {
    treeId: string;
    treeName: string;
    treeIcon: string;
    skillId: string;
    skillName: string;
    skillIcon: string;
    trainingPrompt: string;
  };
  mentor?: {
    id: string;
    name: string;
    icon: string;
    suggestedPrompt: string;
  };
  reason: string;
}

// Time-based themes
function getTimeTheme(): { theme: string; treePreference: string[]; mentorPreference: string[] } {
  const hour = new Date().getHours();
  
  if (hour >= 5 && hour < 9) {
    // Early morning - focus, intention setting
    return {
      theme: 'morning_focus',
      treePreference: ['stoicism', 'discipline', 'effectiveness'],
      mentorPreference: ['marcus_aurelius', 'goggins', 'covey'],
    };
  } else if (hour >= 9 && hour < 12) {
    // Mid-morning - productivity, strategy
    return {
      theme: 'strategic_action',
      treePreference: ['samurai', 'effectiveness', 'stoicism'],
      mentorPreference: ['musashi', 'sun_tzu', 'covey'],
    };
  } else if (hour >= 12 && hour < 14) {
    // Midday - balance, centering
    return {
      theme: 'midday_balance',
      treePreference: ['taoism', 'zen', 'stoicism'],
      mentorPreference: ['lao_tzu', 'zen_master', 'seneca'],
    };
  } else if (hour >= 14 && hour < 17) {
    // Afternoon - persistence, discipline
    return {
      theme: 'afternoon_push',
      treePreference: ['discipline', 'samurai', 'effectiveness'],
      mentorPreference: ['goggins', 'musashi', 'epictetus'],
    };
  } else if (hour >= 17 && hour < 20) {
    // Evening - reflection, relationships
    return {
      theme: 'evening_reflection',
      treePreference: ['zen', 'taoism', 'stoicism'],
      mentorPreference: ['buddha', 'lao_tzu', 'marcus_aurelius'],
    };
  } else {
    // Night - peace, letting go
    return {
      theme: 'night_peace',
      treePreference: ['zen', 'taoism', 'stoicism'],
      mentorPreference: ['zen_master', 'buddha', 'seneca'],
    };
  }
}

// Day of week themes
function getDayTheme(): { focus: string; bonus: string } {
  const day = new Date().getDay();
  
  const themes: Record<number, { focus: string; bonus: string }> = {
    0: { focus: 'reflection', bonus: 'Rest and restore. Review your week.' },
    1: { focus: 'discipline', bonus: 'Start strong. Set the tone.' },
    2: { focus: 'strategy', bonus: 'Plan your battles.' },
    3: { focus: 'balance', bonus: 'Midweek check-in. Find center.' },
    4: { focus: 'persistence', bonus: 'Push through. Almost there.' },
    5: { focus: 'completion', bonus: 'Finish strong. Close loops.' },
    6: { focus: 'growth', bonus: 'Train harder. Level up.' },
  };
  
  return themes[day] || themes[0];
}

async function getAvailableSkills(): Promise<{ tree: SkillTree; skill: Skill }[]> {
  const available: { tree: SkillTree; skill: Skill }[] = [];
  
  try {
    // Fetch progress for all trees
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/philosophy/skills?all=true`, { cache: 'no-store' });
    const data = await res.json();
    
    if (data.ok && data.trees) {
      for (const { tree, progress } of data.trees) {
        const masteredIds = Object.entries(progress)
          .filter(([_, p]: [string, any]) => p.state === 'mastered')
          .map(([id, _]) => id);
        
        for (const skill of tree.skills) {
          // Skip if already mastered or in progress
          if (progress[skill.id]) continue;
          
          // Check prerequisites
          const prereqsMet = skill.prerequisites.every((p: string) => masteredIds.includes(p));
          if (prereqsMet) {
            available.push({ tree, skill });
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch available skills:', error);
    // Fallback: return tier 1 skills from all trees
    for (const tree of ALL_SKILL_TREES) {
      const tier1 = tree.skills.filter(s => s.tier === 1);
      for (const skill of tier1) {
        available.push({ tree, skill });
      }
    }
  }
  
  return available;
}

const MENTOR_DATA: Record<string, { name: string; icon: string }> = {
  marcus_aurelius: { name: "Marcus Aurelius", icon: "👑" },
  seneca: { name: "Seneca", icon: "📜" },
  epictetus: { name: "Epictetus", icon: "⛓️" },
  musashi: { name: "Miyamoto Musashi", icon: "⚔️" },
  sun_tzu: { name: "Sun Tzu", icon: "🏹" },
  lao_tzu: { name: "Lao Tzu", icon: "☯️" },
  zen_master: { name: "Zen Master", icon: "🧘" },
  buddha: { name: "The Buddha", icon: "☸️" },
  covey: { name: "Stephen Covey", icon: "📘" },
  goggins: { name: "David Goggins", icon: "💀" },
};

const MENTOR_PROMPTS: Record<string, string[]> = {
  marcus_aurelius: ["What is testing my patience today?", "Where am I seeking external validation?"],
  seneca: ["What am I avoiding that I know I must do?", "How am I wasting my time?"],
  epictetus: ["What is outside my control that I'm trying to control?", "Where am I playing victim?"],
  musashi: ["What decision am I overthinking?", "Where do I need to act decisively?"],
  sun_tzu: ["What battle should I avoid entirely?", "Where is my opponent's weakness?"],
  lao_tzu: ["Where am I forcing instead of flowing?", "What can I release?"],
  zen_master: ["What is here, right now?", "What am I not seeing?"],
  buddha: ["What attachment is causing my suffering?", "Where can I practice compassion?"],
  covey: ["Am I working on important or just urgent?", "What relationship needs investment?"],
  goggins: ["What excuse am I making?", "Where am I being soft?"],
};

/**
 * GET - Get today's suggested challenges
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const count = parseInt(searchParams.get('count') || '3');
    
    const timeTheme = getTimeTheme();
    const dayTheme = getDayTheme();
    const challenges: DailyChallenge[] = [];
    
    // Get available skills
    const availableSkills = await getAvailableSkills();
    
    // 1. Primary skill challenge (based on time preference)
    const preferredSkills = availableSkills.filter(
      ({ tree }) => timeTheme.treePreference.includes(tree.id)
    );
    const skillPool = preferredSkills.length > 0 ? preferredSkills : availableSkills;
    
    if (skillPool.length > 0) {
      const randomSkill = skillPool[Math.floor(Math.random() * skillPool.length)];
      challenges.push({
        id: `skill-${randomSkill.skill.id}`,
        type: 'skill_training',
        title: `Master: ${randomSkill.skill.name}`,
        description: randomSkill.skill.description,
        timeEstimate: '5-10 min',
        xpReward: randomSkill.skill.xpReward,
        skill: {
          treeId: randomSkill.tree.id,
          treeName: randomSkill.tree.name,
          treeIcon: randomSkill.tree.icon,
          skillId: randomSkill.skill.id,
          skillName: randomSkill.skill.name,
          skillIcon: randomSkill.skill.icon,
          trainingPrompt: randomSkill.skill.trainingPrompt,
        },
        reason: `Perfect for ${timeTheme.theme.replace('_', ' ')}. ${dayTheme.bonus}`,
      });
    }
    
    // 2. Mentor session suggestion
    const preferredMentor = timeTheme.mentorPreference[0];
    const mentorInfo = MENTOR_DATA[preferredMentor];
    const mentorPrompts = MENTOR_PROMPTS[preferredMentor] || ["What's on your mind?"];
    
    challenges.push({
      id: `mentor-${preferredMentor}`,
      type: 'mentor_session',
      title: `Consult ${mentorInfo.name}`,
      description: `Seek wisdom from ${mentorInfo.name} about your current challenges.`,
      timeEstimate: '3-5 min',
      xpReward: 25,
      mentor: {
        id: preferredMentor,
        name: mentorInfo.name,
        icon: mentorInfo.icon,
        suggestedPrompt: mentorPrompts[Math.floor(Math.random() * mentorPrompts.length)],
      },
      reason: `${mentorInfo.name} aligns with your ${timeTheme.theme.replace('_', ' ')} energy.`,
    });
    
    // 3. Quick reflection (if we need more challenges)
    if (count > 2) {
      const reflectionPrompts = [
        { q: "What am I grateful for right now?", theme: "gratitude" },
        { q: "What's one thing I can let go of today?", theme: "release" },
        { q: "Where did I grow yesterday?", theme: "growth" },
        { q: "What would make today great?", theme: "intention" },
        { q: "Who can I help today?", theme: "service" },
      ];
      const reflection = reflectionPrompts[Math.floor(Math.random() * reflectionPrompts.length)];
      
      challenges.push({
        id: `reflection-${reflection.theme}`,
        type: 'reflection',
        title: 'Quick Reflection',
        description: reflection.q,
        timeEstimate: '1-2 min',
        xpReward: 15,
        reason: `Daily ${reflection.theme} practice builds mental strength.`,
      });
    }
    
    // Add a different skill from a different tree if requested
    if (count > 3 && skillPool.length > 1) {
      const usedTreeIds = challenges
        .filter(c => c.skill)
        .map(c => c.skill!.treeId);
      
      const otherSkills = availableSkills.filter(
        ({ tree }) => !usedTreeIds.includes(tree.id)
      );
      
      if (otherSkills.length > 0) {
        const randomOther = otherSkills[Math.floor(Math.random() * otherSkills.length)];
        challenges.push({
          id: `skill-${randomOther.skill.id}`,
          type: 'skill_training',
          title: `Cross-train: ${randomOther.skill.name}`,
          description: randomOther.skill.description,
          timeEstimate: '5-10 min',
          xpReward: randomOther.skill.xpReward,
          skill: {
            treeId: randomOther.tree.id,
            treeName: randomOther.tree.name,
            treeIcon: randomOther.tree.icon,
            skillId: randomOther.skill.id,
            skillName: randomOther.skill.name,
            skillIcon: randomOther.skill.icon,
            trainingPrompt: randomOther.skill.trainingPrompt,
          },
          reason: `Expand your training across philosophies.`,
        });
      }
    }
    
    return NextResponse.json({
      ok: true,
      date: new Date().toISOString().split('T')[0],
      timeTheme: timeTheme.theme,
      dayFocus: dayTheme.focus,
      dayBonus: dayTheme.bonus,
      challenges: challenges.slice(0, count),
      availableSkillCount: availableSkills.length,
    });
    
  } catch (error: any) {
    console.error('Daily challenge error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
