// Career Coach Job Model
// Represents a user's job profile with all context needed for AI coaching

export interface JobModel {
  // Core identification
  industryId: string;
  industryName: string;
  functionId: string;
  functionName: string;
  roleId: string;
  roleName: string;
  seniorityId: string;
  seniorityName: string;
  employmentTypeId: string;
  employmentTypeName: string;
  
  // Computed
  fullTitle: string;
  company?: string;
  
  // From taxonomy (pre-populated)
  typicalOutcomes: string[];
  coreSkills: string[];
  dailyActivities: string[];
  
  // From deep dive (user customization)
  customOutcomes: string[];
  customSkills: string[];
  customActivities: string[];
  stakeholders: string[];
  tools: string[];
  constraints: string[];
  promotionTarget?: string;
  
  // Deep dive insights (from conversational intake)
  deepDiveInsights?: {
    manager?: string;
    directReports?: string;
    companyContext?: string;
    careerGoals?: string;
    frustrations?: string[];
    specificResponsibilities?: string[];
    uniqueInsights?: string[];
  };
  
  // Metadata
  confidenceScore: number; // 0-1
  dataSource: {
    intake: boolean;
    deepDive: boolean;
    secondBrain: boolean;
    userCorrections: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface JobSelectionResult {
  industryId: string;
  industryName: string;
  functionId: string;
  functionName: string;
  roleId: string;
  roleName: string;
  seniorityId: string;
  seniorityName: string;
  employmentTypeId: string;
  employmentTypeName: string;
  fullTitle: string;
  company?: string;
  typicalOutcomes: string[];
  coreSkills: string[];
  dailyActivities: string[];
}

/**
 * Create a new JobModel from selection wizard results
 */
export function createJobModelFromSelection(selection: JobSelectionResult): JobModel {
  return {
    ...selection,
    customOutcomes: [],
    customSkills: [],
    customActivities: [],
    stakeholders: [],
    tools: [],
    constraints: [],
    confidenceScore: 0.8, // High confidence from structured intake
    dataSource: {
      intake: true,
      deepDive: false,
      secondBrain: false,
      userCorrections: 0,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Build coaching context string for AI prompts
 */
export function buildCoachingContext(jobModel: JobModel): string {
  const allOutcomes = [...jobModel.typicalOutcomes, ...jobModel.customOutcomes];
  const allSkills = [...jobModel.coreSkills, ...jobModel.customSkills];
  const allActivities = [...jobModel.dailyActivities, ...jobModel.customActivities];
  
  let context = `## PERSON CONTEXT

**Current Role:** ${jobModel.fullTitle}${jobModel.company ? ` at ${jobModel.company}` : ''}
**Industry:** ${jobModel.industryName}
**Function:** ${jobModel.functionName}
**Level:** ${jobModel.seniorityName}
**Employment:** ${jobModel.employmentTypeName}

**What success looks like in this role:**
${allOutcomes.map(o => `- ${o}`).join('\n')}

**Core skills for this role:**
${allSkills.map(s => `- ${s}`).join('\n')}

**Typical daily work:**
${allActivities.map(a => `- ${a}`).join('\n')}`;

  // Add deep dive info if available
  if (jobModel.stakeholders.length > 0) {
    context += `\n\n**Key stakeholders they work with:**
${jobModel.stakeholders.map(s => `- ${s}`).join('\n')}`;
  }
  
  if (jobModel.tools.length > 0) {
    context += `\n\n**Tools and systems they use:**
${jobModel.tools.map(t => `- ${t}`).join('\n')}`;
  }
  
  if (jobModel.constraints.length > 0) {
    context += `\n\n**Current challenges/constraints:**
${jobModel.constraints.map(c => `- ${c}`).join('\n')}`;
  }
  
  if (jobModel.promotionTarget) {
    context += `\n\n**Career goal:** ${jobModel.promotionTarget}`;
  }
  
  // Add deep dive insights if available
  if (jobModel.deepDiveInsights) {
    const di = jobModel.deepDiveInsights;
    
    if (di.manager) {
      context += `\n\n**Their manager:** ${di.manager}`;
    }
    
    if (di.directReports) {
      context += `\n\n**Direct reports:** ${di.directReports}`;
    }
    
    if (di.specificResponsibilities && di.specificResponsibilities.length > 0) {
      context += `\n\n**Their specific responsibilities:**
${di.specificResponsibilities.map(r => `- ${r}`).join('\n')}`;
    }
    
    if (di.companyContext) {
      context += `\n\n**Company context:** ${di.companyContext}`;
    }
    
    if (di.careerGoals) {
      context += `\n\n**Career aspirations:** ${di.careerGoals}`;
    }
    
    if (di.frustrations && di.frustrations.length > 0) {
      context += `\n\n**Current frustrations:**
${di.frustrations.map(f => `- ${f}`).join('\n')}`;
    }
    
    if (di.uniqueInsights && di.uniqueInsights.length > 0) {
      context += `\n\n**Additional context:**
${di.uniqueInsights.map(i => `- ${i}`).join('\n')}`;
    }
  }
  
  return context;
}

/**
 * Merge partial updates into existing job model
 */
export function updateJobModel(existing: JobModel, updates: Partial<JobModel>): JobModel {
  return {
    ...existing,
    ...updates,
    dataSource: {
      ...existing.dataSource,
      ...updates.dataSource,
      userCorrections: (existing.dataSource?.userCorrections || 0) + 1,
    },
    updatedAt: new Date().toISOString(),
  };
}
