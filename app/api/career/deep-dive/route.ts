import { NextRequest, NextResponse } from "next/server";

interface Question {
  id: string;
  question: string;
  options: { id: string; label: string; icon?: string }[];
  category: string;
}

const UNIVERSAL_QUESTIONS: Question[] = [
  { id: 'team_size', question: 'How big is your team?', category: 'Team', options: [
    { id: 'solo', label: 'Just me', icon: '👤' },
    { id: 'small', label: '2-5 people', icon: '👥' },
    { id: 'medium', label: '6-15 people', icon: '👥' },
    { id: 'large', label: '16-50 people', icon: '🏢' },
    { id: 'xlarge', label: '50+ people', icon: '🏛️' },
  ]},
  { id: 'direct_reports', question: 'Do you manage people?', category: 'Team', options: [
    { id: 'none', label: 'No direct reports', icon: '👤' },
    { id: 'few', label: '1-3 reports', icon: '👥' },
    { id: 'several', label: '4-8 reports', icon: '👥' },
    { id: 'many', label: '9+ reports', icon: '🏢' },
  ]},
  { id: 'boss_type', question: 'Who do you report to?', category: 'Team', options: [
    { id: 'ceo', label: 'CEO / President', icon: '👔' },
    { id: 'c_level', label: 'Other C-Level', icon: '👔' },
    { id: 'vp', label: 'VP / Director', icon: '📊' },
    { id: 'manager', label: 'Manager', icon: '👤' },
    { id: 'founder', label: "I'm the founder", icon: '🚀' },
  ]},
  { id: 'company_size', question: 'Company size?', category: 'Company', options: [
    { id: 'startup', label: 'Startup (<50)', icon: '🚀' },
    { id: 'growth', label: 'Growth (50-200)', icon: '📈' },
    { id: 'midsize', label: 'Mid-size (200-1K)', icon: '🏢' },
    { id: 'large', label: 'Large (1K-10K)', icon: '🏛️' },
    { id: 'enterprise', label: 'Enterprise (10K+)', icon: '🌐' },
  ]},
  { id: 'work_style', question: 'Where do you work?', category: 'Work', options: [
    { id: 'office', label: 'In office', icon: '🏢' },
    { id: 'remote', label: 'Fully remote', icon: '🏠' },
    { id: 'hybrid', label: 'Hybrid', icon: '🔄' },
    { id: 'field', label: 'In the field', icon: '🚗' },
  ]},
  { id: 'biggest_challenge', question: "What's hardest right now?", category: 'Challenges', options: [
    { id: 'time', label: 'Not enough time', icon: '⏰' },
    { id: 'resources', label: 'Limited resources', icon: '💰' },
    { id: 'politics', label: 'Office politics', icon: '🎭' },
    { id: 'skills', label: 'Skill gaps', icon: '📚' },
    { id: 'direction', label: 'Unclear direction', icon: '🧭' },
    { id: 'growth', label: 'Career stagnation', icon: '📉' },
  ]},
  { id: 'career_goal', question: 'Goal in 2 years?', category: 'Goals', options: [
    { id: 'promotion', label: 'Get promoted', icon: '📈' },
    { id: 'lateral', label: 'New role', icon: '↔️' },
    { id: 'company', label: 'New company', icon: '🚪' },
    { id: 'founder', label: 'Start something', icon: '🚀' },
    { id: 'expert', label: 'Go deeper', icon: '🎯' },
    { id: 'happy', label: 'Be happier', icon: '😊' },
  ]},
];

const FUNCTION_QUESTIONS: Record<string, Question[]> = {
  lending: [
    { id: 'lending_type', question: 'What type of lending?', category: 'Role', options: [
      { id: 'cre', label: 'Commercial Real Estate', icon: '🏢' },
      { id: 'ci', label: 'C&I / Business', icon: '🏭' },
      { id: 'sba', label: 'SBA', icon: '📋' },
      { id: 'consumer', label: 'Consumer', icon: '👤' },
      { id: 'mortgage', label: 'Mortgage', icon: '🏠' },
      { id: 'specialty', label: 'Specialty/Other', icon: '⭐' },
    ]},
    { id: 'deal_size', question: 'Typical deal size?', category: 'Role', options: [
      { id: 'small', label: 'Under $500K', icon: '💵' },
      { id: 'medium', label: '$500K - $2M', icon: '💰' },
      { id: 'large', label: '$2M - $10M', icon: '💰' },
      { id: 'xlarge', label: '$10M - $50M', icon: '🏦' },
      { id: 'mega', label: '$50M+', icon: '🏛️' },
    ]},
    { id: 'lending_focus', question: 'Where do you spend most time?', category: 'Role', options: [
      { id: 'origination', label: 'Finding deals', icon: '🔍' },
      { id: 'underwriting', label: 'Credit analysis', icon: '📊' },
      { id: 'structuring', label: 'Structuring', icon: '🔧' },
      { id: 'portfolio', label: 'Portfolio mgmt', icon: '📁' },
      { id: 'relationships', label: 'Relationships', icon: '🤝' },
    ]},
    { id: 'approval_authority', question: 'Your lending authority?', category: 'Role', options: [
      { id: 'none', label: 'No authority', icon: '📝' },
      { id: 'limited', label: 'Up to $250K', icon: '💵' },
      { id: 'moderate', label: '$250K - $1M', icon: '��' },
      { id: 'high', label: '$1M - $5M', icon: '💰' },
      { id: 'senior', label: '$5M+', icon: '🏦' },
    ]},
    { id: 'credit_committee', question: 'How are deals approved?', category: 'Process', options: [
      { id: 'me', label: 'I approve them', icon: '✅' },
      { id: 'manager', label: 'Manager approves', icon: '👤' },
      { id: 'committee', label: 'Credit committee', icon: '👥' },
      { id: 'board', label: 'Board approval', icon: '🏛️' },
    ]},
    { id: 'client_type', question: 'Who are your clients?', category: 'Role', options: [
      { id: 'small_biz', label: 'Small business', icon: '🏪' },
      { id: 'mid_market', label: 'Mid-market', icon: '🏢' },
      { id: 'large_corp', label: 'Large corporate', icon: '🏛️' },
      { id: 'investors', label: 'RE investors', icon: '🏠' },
      { id: 'consumers', label: 'Consumers', icon: '👤' },
    ]},
  ],
  default: [
    { id: 'primary_focus', question: 'Most time spent on?', category: 'Role', options: [
      { id: 'execution', label: 'Executing work', icon: '⚡' },
      { id: 'strategy', label: 'Planning', icon: '🗺️' },
      { id: 'management', label: 'Managing people', icon: '👥' },
      { id: 'stakeholders', label: 'Stakeholders', icon: '🤝' },
      { id: 'analysis', label: 'Analysis', icon: '📊' },
    ]},
  ],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const functionId = searchParams.get('function') || 'default';
  const functionQs = FUNCTION_QUESTIONS[functionId] || FUNCTION_QUESTIONS.default;
  return NextResponse.json({ ok: true, questions: [...functionQs, ...UNIVERSAL_QUESTIONS] });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  if (body.action === 'complete') {
    return NextResponse.json({ ok: true, insights: transformAnswers(body.answers) });
  }
  return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
}

function transformAnswers(answers: Record<string, string>) {
  const insights: any = { teamContext: {}, roleSpecifics: {}, challenges: [], goals: {}, workStyle: {}, companyContext: '' };
  const maps: Record<string, Record<string, string>> = {
    team_size: { solo: 'Works independently', small: 'Small team (2-5)', medium: 'Medium team (6-15)', large: 'Large team (16-50)', xlarge: 'Large org (50+)' },
    direct_reports: { none: 'Individual contributor', few: 'Manages 1-3', several: 'Manages 4-8', many: 'Manages 9+' },
    boss_type: { ceo: 'Reports to CEO', c_level: 'Reports to C-Level', vp: 'Reports to VP/Director', manager: 'Reports to Manager', founder: 'Is founder' },
    company_size: { startup: 'Startup (<50)', growth: 'Growth (50-200)', midsize: 'Mid-size (200-1K)', large: 'Large (1K-10K)', enterprise: 'Enterprise (10K+)' },
    biggest_challenge: { time: 'Not enough time', resources: 'Limited resources', politics: 'Office politics', skills: 'Skill gaps', direction: 'Unclear direction', growth: 'Career stagnation' },
    career_goal: { promotion: 'Get promoted', lateral: 'Change roles', company: 'Change companies', founder: 'Start own thing', expert: 'Become expert', happy: 'Find satisfaction' },
  };
  if (answers.team_size) insights.teamContext.teamSize = maps.team_size[answers.team_size];
  if (answers.direct_reports) insights.teamContext.directReports = maps.direct_reports[answers.direct_reports];
  if (answers.boss_type) insights.teamContext.reportsTo = maps.boss_type[answers.boss_type];
  if (answers.company_size) insights.companyContext = maps.company_size[answers.company_size];
  if (answers.work_style) insights.workStyle.location = answers.work_style;
  if (answers.biggest_challenge) insights.challenges = [maps.biggest_challenge[answers.biggest_challenge]];
  if (answers.career_goal) insights.goals.twoYear = maps.career_goal[answers.career_goal];
  ['lending_type', 'deal_size', 'lending_focus', 'approval_authority', 'credit_committee', 'client_type', 'primary_focus'].forEach(key => {
    if (answers[key]) insights.roleSpecifics[key] = answers[key];
  });
  return insights;
}
