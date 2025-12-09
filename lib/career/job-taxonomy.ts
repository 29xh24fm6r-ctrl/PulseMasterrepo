// Career Coach Job Taxonomy
// 17 Industries, 25 Functions, 50+ Roles

export interface Industry {
  id: string;
  name: string;
  icon: string;
  functions: string[]; // IDs of applicable functions
}

export interface JobFunction {
  id: string;
  name: string;
  industries: string[]; // IDs of applicable industries
}

export interface Role {
  id: string;
  name: string;
  functionId: string;
  alternativeTitles: string[];
  description: string;
  typicalOutcomes: string[];
  coreSkills: string[];
  dailyActivities: string[];
  applicableIndustries: string[]; // Empty = all
}

export interface SeniorityLevel {
  id: string;
  name: string;
  yearsExperience: string;
  prefix?: string;
}

export interface EmploymentType {
  id: string;
  name: string;
  icon: string;
}

// 17 Industries
export const INDUSTRIES: Industry[] = [
  { id: 'tech', name: 'Technology', icon: '💻', functions: ['engineering', 'product', 'design', 'sales', 'marketing', 'customer_success', 'operations', 'finance', 'hr', 'legal', 'executive', 'data', 'it', 'security'] },
  { id: 'finance', name: 'Finance & Banking', icon: '🏦', functions: ['finance', 'lending', 'trading', 'sales', 'operations', 'hr', 'legal', 'executive', 'data', 'it', 'security', 'consulting'] },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥', functions: ['clinical', 'research', 'operations', 'finance', 'hr', 'legal', 'executive', 'it', 'sales', 'marketing'] },
  { id: 'retail', name: 'Retail & E-commerce', icon: '🛍️', functions: ['sales', 'marketing', 'operations', 'supply_chain', 'finance', 'hr', 'executive', 'data', 'it', 'customer_success'] },
  { id: 'manufacturing', name: 'Manufacturing', icon: '🏭', functions: ['engineering', 'operations', 'supply_chain', 'finance', 'hr', 'executive', 'sales', 'it', 'security'] },
  { id: 'consulting', name: 'Consulting', icon: '📊', functions: ['consulting', 'sales', 'operations', 'finance', 'hr', 'executive', 'data'] },
  { id: 'media', name: 'Media & Entertainment', icon: '📺', functions: ['content_creation', 'production', 'marketing', 'sales', 'operations', 'finance', 'hr', 'legal', 'executive'] },
  { id: 'education', name: 'Education', icon: '🎓', functions: ['teaching', 'research', 'operations', 'finance', 'hr', 'executive', 'it'] },
  { id: 'government', name: 'Government', icon: '🏛️', functions: ['operations', 'finance', 'hr', 'legal', 'executive', 'it', 'security', 'research'] },
  { id: 'nonprofit', name: 'Nonprofit', icon: '💚', functions: ['operations', 'finance', 'hr', 'executive', 'marketing', 'sales'] },
  { id: 'real_estate', name: 'Real Estate', icon: '🏠', functions: ['property', 'sales', 'finance', 'operations', 'hr', 'legal', 'executive'] },
  { id: 'hospitality', name: 'Hospitality', icon: '🏨', functions: ['operations', 'sales', 'marketing', 'finance', 'hr', 'executive', 'customer_success'] },
  { id: 'legal', name: 'Legal Services', icon: '⚖️', functions: ['legal', 'operations', 'finance', 'hr', 'executive', 'it'] },
  { id: 'energy', name: 'Energy & Utilities', icon: '⚡', functions: ['engineering', 'operations', 'finance', 'hr', 'legal', 'executive', 'it', 'sales'] },
  { id: 'creator', name: 'Creator Economy', icon: '🎬', functions: ['content_creation', 'marketing', 'sales', 'operations', 'finance'] },
  { id: 'startup', name: 'Startup', icon: '🚀', functions: ['founder', 'engineering', 'product', 'design', 'sales', 'marketing', 'operations', 'finance', 'hr', 'executive', 'data'] },
  { id: 'other', name: 'Other', icon: '🌐', functions: ['operations', 'finance', 'hr', 'sales', 'marketing', 'executive', 'it'] },
];

// 25 Job Functions
export const JOB_FUNCTIONS: JobFunction[] = [
  { id: 'engineering', name: 'Engineering', industries: ['tech', 'manufacturing', 'energy', 'startup'] },
  { id: 'product', name: 'Product', industries: ['tech', 'startup'] },
  { id: 'design', name: 'Design', industries: ['tech', 'startup', 'media'] },
  { id: 'sales', name: 'Sales', industries: ['tech', 'finance', 'retail', 'consulting', 'media', 'real_estate', 'hospitality', 'energy', 'startup', 'other'] },
  { id: 'marketing', name: 'Marketing', industries: ['tech', 'retail', 'media', 'nonprofit', 'hospitality', 'creator', 'startup', 'other'] },
  { id: 'customer_success', name: 'Customer Success', industries: ['tech', 'retail', 'hospitality', 'startup'] },
  { id: 'operations', name: 'Operations', industries: ['tech', 'finance', 'healthcare', 'retail', 'manufacturing', 'consulting', 'media', 'education', 'government', 'nonprofit', 'real_estate', 'hospitality', 'legal', 'energy', 'creator', 'startup', 'other'] },
  { id: 'finance', name: 'Finance & Accounting', industries: ['tech', 'finance', 'healthcare', 'retail', 'manufacturing', 'consulting', 'media', 'education', 'government', 'nonprofit', 'real_estate', 'hospitality', 'legal', 'energy', 'creator', 'startup', 'other'] },
  { id: 'hr', name: 'Human Resources', industries: ['tech', 'finance', 'healthcare', 'retail', 'manufacturing', 'consulting', 'media', 'education', 'government', 'nonprofit', 'real_estate', 'hospitality', 'legal', 'energy', 'startup', 'other'] },
  { id: 'legal', name: 'Legal', industries: ['tech', 'finance', 'healthcare', 'media', 'government', 'real_estate', 'legal', 'energy'] },
  { id: 'executive', name: 'Executive / Leadership', industries: ['tech', 'finance', 'healthcare', 'retail', 'manufacturing', 'consulting', 'media', 'education', 'government', 'nonprofit', 'real_estate', 'hospitality', 'legal', 'energy', 'startup', 'other'] },
  { id: 'data', name: 'Data & Analytics', industries: ['tech', 'finance', 'retail', 'consulting', 'startup'] },
  { id: 'it', name: 'IT & Infrastructure', industries: ['tech', 'finance', 'healthcare', 'retail', 'education', 'government', 'legal', 'energy', 'other'] },
  { id: 'security', name: 'Security', industries: ['tech', 'finance', 'government', 'manufacturing'] },
  { id: 'research', name: 'Research', industries: ['healthcare', 'education', 'government'] },
  { id: 'clinical', name: 'Clinical', industries: ['healthcare'] },
  { id: 'lending', name: 'Lending & Credit', industries: ['finance'] },
  { id: 'trading', name: 'Trading & Investments', industries: ['finance'] },
  { id: 'teaching', name: 'Teaching', industries: ['education'] },
  { id: 'content_creation', name: 'Content Creation', industries: ['media', 'creator'] },
  { id: 'production', name: 'Production', industries: ['media'] },
  { id: 'supply_chain', name: 'Supply Chain', industries: ['retail', 'manufacturing'] },
  { id: 'property', name: 'Property Management', industries: ['real_estate'] },
  { id: 'consulting', name: 'Consulting', industries: ['consulting', 'finance'] },
  { id: 'founder', name: 'Founder / Entrepreneur', industries: ['startup', 'creator'] },
];

// 50+ Roles
export const ROLES: Role[] = [
  // Engineering roles
  {
    id: 'software_engineer',
    name: 'Software Engineer',
    functionId: 'engineering',
    alternativeTitles: ['Developer', 'Programmer', 'SWE'],
    description: 'Design, build, and maintain software systems',
    typicalOutcomes: ['Code quality', 'Feature delivery', 'System reliability', 'Technical debt reduction'],
    coreSkills: ['Programming', 'System design', 'Problem solving', 'Code review', 'Testing'],
    dailyActivities: ['Writing code', 'Code reviews', 'Debugging', 'Team standups', 'Technical discussions'],
    applicableIndustries: [],
  },
  {
    id: 'frontend_engineer',
    name: 'Frontend Engineer',
    functionId: 'engineering',
    alternativeTitles: ['UI Developer', 'Web Developer'],
    description: 'Build user interfaces and web applications',
    typicalOutcomes: ['UI performance', 'User experience', 'Cross-browser compatibility', 'Accessibility'],
    coreSkills: ['JavaScript', 'React/Vue/Angular', 'CSS', 'Performance optimization', 'Responsive design'],
    dailyActivities: ['Building UI components', 'Styling', 'API integration', 'Browser testing', 'Design collaboration'],
    applicableIndustries: [],
  },
  {
    id: 'backend_engineer',
    name: 'Backend Engineer',
    functionId: 'engineering',
    alternativeTitles: ['Server-side Developer', 'API Developer'],
    description: 'Build server-side systems and APIs',
    typicalOutcomes: ['API reliability', 'System performance', 'Data integrity', 'Scalability'],
    coreSkills: ['Backend languages', 'Databases', 'API design', 'System architecture', 'Security'],
    dailyActivities: ['API development', 'Database work', 'System optimization', 'Integration work', 'Documentation'],
    applicableIndustries: [],
  },
  {
    id: 'fullstack_engineer',
    name: 'Fullstack Engineer',
    functionId: 'engineering',
    alternativeTitles: ['Full Stack Developer'],
    description: 'Work across frontend and backend systems',
    typicalOutcomes: ['End-to-end feature delivery', 'System integration', 'Full product ownership'],
    coreSkills: ['Frontend', 'Backend', 'Databases', 'DevOps basics', 'System design'],
    dailyActivities: ['Full feature development', 'Cross-stack debugging', 'Architecture decisions', 'Team collaboration'],
    applicableIndustries: [],
  },
  {
    id: 'devops_engineer',
    name: 'DevOps Engineer',
    functionId: 'engineering',
    alternativeTitles: ['Site Reliability Engineer', 'SRE', 'Platform Engineer'],
    description: 'Build and maintain deployment infrastructure',
    typicalOutcomes: ['System uptime', 'Deployment speed', 'Infrastructure cost', 'Incident response time'],
    coreSkills: ['Cloud platforms', 'CI/CD', 'Containers', 'Monitoring', 'Automation'],
    dailyActivities: ['Pipeline management', 'Infrastructure as code', 'Monitoring', 'Incident response', 'Optimization'],
    applicableIndustries: [],
  },
  {
    id: 'engineering_manager',
    name: 'Engineering Manager',
    functionId: 'engineering',
    alternativeTitles: ['Tech Lead', 'Dev Manager'],
    description: 'Lead engineering teams and deliver technical projects',
    typicalOutcomes: ['Team velocity', 'Engineer retention', 'Technical quality', 'Project delivery'],
    coreSkills: ['People management', 'Technical leadership', 'Project planning', 'Hiring', 'Communication'],
    dailyActivities: ['1:1s', 'Sprint planning', 'Code reviews', 'Stakeholder meetings', 'Hiring'],
    applicableIndustries: [],
  },
  
  // Product roles
  {
    id: 'product_manager',
    name: 'Product Manager',
    functionId: 'product',
    alternativeTitles: ['PM', 'Product Owner'],
    description: 'Define product strategy and drive feature development',
    typicalOutcomes: ['Product metrics', 'Feature adoption', 'User satisfaction', 'Revenue impact'],
    coreSkills: ['Product strategy', 'User research', 'Data analysis', 'Prioritization', 'Stakeholder management'],
    dailyActivities: ['Roadmap planning', 'User interviews', 'Sprint reviews', 'Cross-functional meetings', 'Data analysis'],
    applicableIndustries: [],
  },
  {
    id: 'product_designer',
    name: 'Product Designer',
    functionId: 'design',
    alternativeTitles: ['UX Designer', 'UI/UX Designer'],
    description: 'Design user experiences and interfaces',
    typicalOutcomes: ['User satisfaction', 'Task completion rates', 'Design system adoption', 'Usability scores'],
    coreSkills: ['UI design', 'UX research', 'Prototyping', 'Design systems', 'User testing'],
    dailyActivities: ['Wireframing', 'User research', 'Design reviews', 'Prototyping', 'Developer handoff'],
    applicableIndustries: [],
  },
  
  // Sales roles
  {
    id: 'account_executive',
    name: 'Account Executive',
    functionId: 'sales',
    alternativeTitles: ['AE', 'Sales Rep', 'Sales Executive'],
    description: 'Close deals and manage customer relationships',
    typicalOutcomes: ['Quota attainment', 'Deal size', 'Win rate', 'Pipeline generation'],
    coreSkills: ['Negotiation', 'Presentation', 'Relationship building', 'CRM management', 'Objection handling'],
    dailyActivities: ['Customer calls', 'Demos', 'Proposal writing', 'Pipeline management', 'Forecasting'],
    applicableIndustries: [],
  },
  {
    id: 'sdr',
    name: 'Sales Development Rep',
    functionId: 'sales',
    alternativeTitles: ['SDR', 'BDR', 'Business Development Rep'],
    description: 'Generate and qualify sales leads',
    typicalOutcomes: ['Meetings booked', 'Lead quality', 'Response rates', 'Pipeline contribution'],
    coreSkills: ['Prospecting', 'Cold calling', 'Email outreach', 'Qualification', 'CRM management'],
    dailyActivities: ['Cold calls', 'Email sequences', 'LinkedIn outreach', 'Lead research', 'CRM updates'],
    applicableIndustries: [],
  },
  {
    id: 'sales_manager',
    name: 'Sales Manager',
    functionId: 'sales',
    alternativeTitles: ['Sales Team Lead', 'Regional Sales Manager'],
    description: 'Lead sales team to hit revenue targets',
    typicalOutcomes: ['Team quota', 'Rep performance', 'Forecast accuracy', 'Team retention'],
    coreSkills: ['Coaching', 'Forecasting', 'Pipeline management', 'Hiring', 'Performance management'],
    dailyActivities: ['Pipeline reviews', '1:1 coaching', 'Deal strategy', 'Forecasting', 'Hiring'],
    applicableIndustries: [],
  },
  
  // Marketing roles
  {
    id: 'marketing_manager',
    name: 'Marketing Manager',
    functionId: 'marketing',
    alternativeTitles: ['Marketing Lead'],
    description: 'Plan and execute marketing campaigns',
    typicalOutcomes: ['Lead generation', 'Brand awareness', 'Campaign ROI', 'Marketing qualified leads'],
    coreSkills: ['Campaign management', 'Analytics', 'Content strategy', 'Budget management', 'Team leadership'],
    dailyActivities: ['Campaign planning', 'Performance analysis', 'Team coordination', 'Vendor management', 'Reporting'],
    applicableIndustries: [],
  },
  {
    id: 'growth_marketer',
    name: 'Growth Marketer',
    functionId: 'marketing',
    alternativeTitles: ['Growth Manager', 'Growth Hacker'],
    description: 'Drive user acquisition and retention through experiments',
    typicalOutcomes: ['User growth', 'Conversion rates', 'CAC', 'Retention'],
    coreSkills: ['A/B testing', 'Analytics', 'Paid acquisition', 'Funnel optimization', 'Data analysis'],
    dailyActivities: ['Running experiments', 'Analyzing data', 'Optimizing funnels', 'Channel management', 'Reporting'],
    applicableIndustries: [],
  },
  {
    id: 'content_marketer',
    name: 'Content Marketer',
    functionId: 'marketing',
    alternativeTitles: ['Content Manager', 'Content Strategist'],
    description: 'Create and distribute content to attract customers',
    typicalOutcomes: ['Traffic', 'Engagement', 'Lead generation', 'SEO rankings'],
    coreSkills: ['Writing', 'SEO', 'Content strategy', 'Distribution', 'Analytics'],
    dailyActivities: ['Writing content', 'SEO optimization', 'Social media', 'Performance tracking', 'Editorial planning'],
    applicableIndustries: [],
  },
  
  // Customer Success
  {
    id: 'csm',
    name: 'Customer Success Manager',
    functionId: 'customer_success',
    alternativeTitles: ['CSM', 'Account Manager'],
    description: 'Ensure customer satisfaction and drive renewals',
    typicalOutcomes: ['Net retention', 'Customer satisfaction', 'Expansion revenue', 'Churn reduction'],
    coreSkills: ['Relationship building', 'Problem solving', 'Product knowledge', 'Communication', 'Data analysis'],
    dailyActivities: ['Customer calls', 'Onboarding', 'QBRs', 'Issue resolution', 'Upselling'],
    applicableIndustries: [],
  },
  
  // Finance & Accounting roles
  {
    id: 'accountant',
    name: 'Accountant',
    functionId: 'finance',
    alternativeTitles: ['Staff Accountant'],
    description: 'Manage financial records and reporting',
    typicalOutcomes: ['Reporting accuracy', 'Compliance', 'Close timeliness', 'Audit results'],
    coreSkills: ['GAAP', 'Financial reporting', 'Excel', 'ERP systems', 'Attention to detail'],
    dailyActivities: ['Journal entries', 'Reconciliations', 'Financial statements', 'Audit support', 'Month-end close'],
    applicableIndustries: [],
  },
  {
    id: 'financial_analyst',
    name: 'Financial Analyst',
    functionId: 'finance',
    alternativeTitles: ['FP&A Analyst', 'Business Analyst'],
    description: 'Analyze financial data and support decision-making',
    typicalOutcomes: ['Forecast accuracy', 'Analysis quality', 'Budget variance', 'Decision support'],
    coreSkills: ['Financial modeling', 'Excel', 'Data analysis', 'Presentation', 'Business acumen'],
    dailyActivities: ['Building models', 'Variance analysis', 'Forecasting', 'Reporting', 'Stakeholder presentations'],
    applicableIndustries: [],
  },
  {
    id: 'controller',
    name: 'Controller',
    functionId: 'finance',
    alternativeTitles: ['Accounting Manager'],
    description: 'Oversee accounting operations and financial controls',
    typicalOutcomes: ['Audit results', 'Control effectiveness', 'Team performance', 'Reporting quality'],
    coreSkills: ['GAAP', 'Team management', 'Internal controls', 'ERP systems', 'Financial reporting'],
    dailyActivities: ['Team management', 'Review financials', 'Control oversight', 'Audit coordination', 'Process improvement'],
    applicableIndustries: [],
  },
  
  // Lending roles
  {
    id: 'loan_officer',
    name: 'Loan Officer',
    functionId: 'lending',
    alternativeTitles: ['Mortgage Loan Officer', 'Commercial Loan Officer'],
    description: 'Originate and process loan applications',
    typicalOutcomes: ['Loan volume', 'Application quality', 'Approval rates', 'Customer satisfaction'],
    coreSkills: ['Credit analysis', 'Customer service', 'Regulatory compliance', 'Negotiation', 'Sales'],
    dailyActivities: ['Client meetings', 'Application review', 'Underwriting coordination', 'Document collection', 'Pipeline management'],
    applicableIndustries: ['finance'],
  },
  {
    id: 'credit_analyst',
    name: 'Credit Analyst',
    functionId: 'lending',
    alternativeTitles: ['Credit Underwriter', 'Risk Analyst'],
    description: 'Analyze creditworthiness and make lending recommendations',
    typicalOutcomes: ['Analysis accuracy', 'Risk assessment', 'Portfolio quality', 'Decision timeliness'],
    coreSkills: ['Financial analysis', 'Risk assessment', 'Financial spreading', 'Industry analysis', 'Report writing'],
    dailyActivities: ['Financial spreading', 'Risk analysis', 'Credit memos', 'Committee presentations', 'Portfolio monitoring'],
    applicableIndustries: ['finance'],
  },
  {
    id: 'relationship_manager',
    name: 'Relationship Manager',
    functionId: 'lending',
    alternativeTitles: ['Commercial Banker', 'Business Banker'],
    description: 'Manage commercial banking relationships',
    typicalOutcomes: ['Portfolio growth', 'Client retention', 'Cross-sell revenue', 'Credit quality'],
    coreSkills: ['Relationship building', 'Credit analysis', 'Sales', 'Product knowledge', 'Negotiation'],
    dailyActivities: ['Client meetings', 'Deal structuring', 'Portfolio reviews', 'Business development', 'Credit monitoring'],
    applicableIndustries: ['finance'],
  },
  
  // Operations roles
  {
    id: 'operations_manager',
    name: 'Operations Manager',
    functionId: 'operations',
    alternativeTitles: ['Ops Manager', 'Business Operations Manager'],
    description: 'Oversee daily operations and improve efficiency',
    typicalOutcomes: ['Operational efficiency', 'Cost reduction', 'Process improvement', 'Team performance'],
    coreSkills: ['Process optimization', 'Team management', 'Problem solving', 'Project management', 'Data analysis'],
    dailyActivities: ['Team management', 'Process improvement', 'Cross-functional coordination', 'Performance tracking', 'Issue resolution'],
    applicableIndustries: [],
  },
  {
    id: 'project_manager',
    name: 'Project Manager',
    functionId: 'operations',
    alternativeTitles: ['PM', 'Program Manager'],
    description: 'Plan and execute projects on time and budget',
    typicalOutcomes: ['On-time delivery', 'Budget adherence', 'Stakeholder satisfaction', 'Quality'],
    coreSkills: ['Project planning', 'Risk management', 'Stakeholder management', 'Communication', 'Problem solving'],
    dailyActivities: ['Project planning', 'Status meetings', 'Risk tracking', 'Stakeholder updates', 'Resource coordination'],
    applicableIndustries: [],
  },
  
  // HR roles
  {
    id: 'recruiter',
    name: 'Recruiter',
    functionId: 'hr',
    alternativeTitles: ['Talent Acquisition', 'TA'],
    description: 'Source and hire top talent',
    typicalOutcomes: ['Hires made', 'Time to fill', 'Quality of hire', 'Candidate experience'],
    coreSkills: ['Sourcing', 'Interviewing', 'Relationship building', 'Negotiation', 'ATS management'],
    dailyActivities: ['Sourcing candidates', 'Screening calls', 'Interview coordination', 'Offer negotiation', 'Pipeline management'],
    applicableIndustries: [],
  },
  {
    id: 'hrbp',
    name: 'HR Business Partner',
    functionId: 'hr',
    alternativeTitles: ['HRBP', 'People Partner'],
    description: 'Strategic HR support for business units',
    typicalOutcomes: ['Employee engagement', 'Retention', 'Manager effectiveness', 'HR compliance'],
    coreSkills: ['Employee relations', 'Performance management', 'Coaching', 'Employment law', 'Organizational development'],
    dailyActivities: ['Manager coaching', 'Employee relations', 'Performance support', 'Policy guidance', 'Org planning'],
    applicableIndustries: [],
  },
  
  // Data roles
  {
    id: 'data_analyst',
    name: 'Data Analyst',
    functionId: 'data',
    alternativeTitles: ['Business Analyst', 'Analytics Analyst'],
    description: 'Analyze data to drive business decisions',
    typicalOutcomes: ['Insight quality', 'Decision impact', 'Dashboard adoption', 'Analysis speed'],
    coreSkills: ['SQL', 'Data visualization', 'Statistics', 'Excel', 'Storytelling'],
    dailyActivities: ['Running queries', 'Building dashboards', 'Ad hoc analysis', 'Stakeholder presentations', 'Data quality checks'],
    applicableIndustries: [],
  },
  {
    id: 'data_scientist',
    name: 'Data Scientist',
    functionId: 'data',
    alternativeTitles: ['ML Engineer', 'Machine Learning Engineer'],
    description: 'Build predictive models and ML systems',
    typicalOutcomes: ['Model accuracy', 'Business impact', 'Production models', 'Research contributions'],
    coreSkills: ['Machine learning', 'Python', 'Statistics', 'Data engineering', 'Experimentation'],
    dailyActivities: ['Model building', 'Feature engineering', 'Experimentation', 'Research', 'Stakeholder collaboration'],
    applicableIndustries: [],
  },
  {
    id: 'data_engineer',
    name: 'Data Engineer',
    functionId: 'data',
    alternativeTitles: ['Analytics Engineer'],
    description: 'Build data pipelines and infrastructure',
    typicalOutcomes: ['Pipeline reliability', 'Data quality', 'Query performance', 'Data availability'],
    coreSkills: ['SQL', 'Python', 'ETL', 'Data warehousing', 'Cloud platforms'],
    dailyActivities: ['Pipeline development', 'Data modeling', 'Performance optimization', 'Data quality', 'Documentation'],
    applicableIndustries: [],
  },
  
  // Executive roles
  {
    id: 'ceo',
    name: 'CEO',
    functionId: 'executive',
    alternativeTitles: ['Chief Executive Officer', 'President'],
    description: 'Lead the company and set strategic direction',
    typicalOutcomes: ['Company growth', 'Profitability', 'Market position', 'Team building'],
    coreSkills: ['Strategic vision', 'Leadership', 'Board management', 'Fundraising', 'Communication'],
    dailyActivities: ['Strategy meetings', 'Investor relations', 'Team leadership', 'External relations', 'Decision making'],
    applicableIndustries: [],
  },
  {
    id: 'cto',
    name: 'CTO',
    functionId: 'executive',
    alternativeTitles: ['Chief Technology Officer', 'VP Engineering'],
    description: 'Lead technology strategy and engineering organization',
    typicalOutcomes: ['Technical excellence', 'Team scaling', 'Platform reliability', 'Innovation'],
    coreSkills: ['Technical leadership', 'Strategy', 'Team building', 'Architecture', 'Vendor management'],
    dailyActivities: ['Tech strategy', 'Team leadership', 'Architecture decisions', 'Stakeholder management', 'Recruiting'],
    applicableIndustries: [],
  },
  {
    id: 'cfo',
    name: 'CFO',
    functionId: 'executive',
    alternativeTitles: ['Chief Financial Officer', 'VP Finance'],
    description: 'Lead financial strategy and operations',
    typicalOutcomes: ['Financial health', 'Fundraising', 'Financial controls', 'Strategic planning'],
    coreSkills: ['Financial strategy', 'Fundraising', 'Board reporting', 'Team leadership', 'Risk management'],
    dailyActivities: ['Financial planning', 'Board preparation', 'Investor relations', 'Team leadership', 'Strategic planning'],
    applicableIndustries: [],
  },
  
  // Consulting
  {
    id: 'consultant',
    name: 'Consultant',
    functionId: 'consulting',
    alternativeTitles: ['Management Consultant', 'Strategy Consultant'],
    description: 'Advise clients on business challenges',
    typicalOutcomes: ['Client satisfaction', 'Project delivery', 'Utilization', 'Business development'],
    coreSkills: ['Problem solving', 'Analysis', 'Presentation', 'Client management', 'Industry expertise'],
    dailyActivities: ['Client meetings', 'Analysis', 'Presentation building', 'Research', 'Team collaboration'],
    applicableIndustries: [],
  },
  
  // Clinical
  {
    id: 'nurse',
    name: 'Nurse',
    functionId: 'clinical',
    alternativeTitles: ['RN', 'Registered Nurse'],
    description: 'Provide patient care and clinical support',
    typicalOutcomes: ['Patient outcomes', 'Care quality', 'Patient satisfaction', 'Safety compliance'],
    coreSkills: ['Clinical skills', 'Patient care', 'Documentation', 'Communication', 'Critical thinking'],
    dailyActivities: ['Patient care', 'Medication administration', 'Documentation', 'Family communication', 'Care coordination'],
    applicableIndustries: ['healthcare'],
  },
  {
    id: 'physician',
    name: 'Physician',
    functionId: 'clinical',
    alternativeTitles: ['Doctor', 'MD'],
    description: 'Diagnose and treat patients',
    typicalOutcomes: ['Patient outcomes', 'Diagnostic accuracy', 'Patient volume', 'Quality metrics'],
    coreSkills: ['Clinical expertise', 'Diagnosis', 'Patient communication', 'Medical knowledge', 'Decision making'],
    dailyActivities: ['Patient consultations', 'Diagnosis', 'Treatment planning', 'Documentation', 'Care coordination'],
    applicableIndustries: ['healthcare'],
  },
  
  // Teaching
  {
    id: 'teacher',
    name: 'Teacher',
    functionId: 'teaching',
    alternativeTitles: ['Educator', 'Instructor'],
    description: 'Educate and develop students',
    typicalOutcomes: ['Student outcomes', 'Engagement', 'Curriculum delivery', 'Parent satisfaction'],
    coreSkills: ['Instruction', 'Curriculum development', 'Classroom management', 'Communication', 'Assessment'],
    dailyActivities: ['Teaching', 'Lesson planning', 'Grading', 'Parent communication', 'Professional development'],
    applicableIndustries: ['education'],
  },
  {
    id: 'professor',
    name: 'Professor',
    functionId: 'teaching',
    alternativeTitles: ['Faculty', 'Academic'],
    description: 'Teach and conduct research at university level',
    typicalOutcomes: ['Research output', 'Student outcomes', 'Grants', 'Publications'],
    coreSkills: ['Research', 'Teaching', 'Grant writing', 'Publishing', 'Mentorship'],
    dailyActivities: ['Teaching', 'Research', 'Writing', 'Advising students', 'Committee work'],
    applicableIndustries: ['education'],
  },
  
  // Content Creation
  {
    id: 'content_creator',
    name: 'Content Creator',
    functionId: 'content_creation',
    alternativeTitles: ['Creator', 'Influencer'],
    description: 'Create and distribute digital content',
    typicalOutcomes: ['Audience growth', 'Engagement', 'Revenue', 'Brand deals'],
    coreSkills: ['Content creation', 'Audience building', 'Platform expertise', 'Brand partnerships', 'Monetization'],
    dailyActivities: ['Content creation', 'Community engagement', 'Analytics review', 'Brand partnerships', 'Platform optimization'],
    applicableIndustries: ['creator', 'media'],
  },
  {
    id: 'streamer',
    name: 'Streamer',
    functionId: 'content_creation',
    alternativeTitles: ['Live Streamer', 'Broadcaster'],
    description: 'Create live streaming content',
    typicalOutcomes: ['Viewer count', 'Subscriber growth', 'Stream revenue', 'Engagement'],
    coreSkills: ['Entertainment', 'Community building', 'Technical setup', 'Consistency', 'Monetization'],
    dailyActivities: ['Streaming', 'Community interaction', 'Content planning', 'Technical setup', 'Collaboration'],
    applicableIndustries: ['creator'],
  },
  
  // Founder
  {
    id: 'startup_founder',
    name: 'Startup Founder',
    functionId: 'founder',
    alternativeTitles: ['Entrepreneur', 'Co-founder'],
    description: 'Build and lead a startup company',
    typicalOutcomes: ['Revenue', 'Fundraising', 'Team growth', 'Product-market fit'],
    coreSkills: ['Vision', 'Fundraising', 'Team building', 'Product sense', 'Resilience'],
    dailyActivities: ['Product work', 'Fundraising', 'Hiring', 'Customer development', 'Strategic planning'],
    applicableIndustries: ['startup'],
  },
];

// 8 Seniority Levels
export const SENIORITY_LEVELS: SeniorityLevel[] = [
  { id: 'entry', name: 'Entry Level', yearsExperience: '0-2 years', prefix: '' },
  { id: 'mid', name: 'Mid Level', yearsExperience: '2-5 years', prefix: '' },
  { id: 'senior', name: 'Senior', yearsExperience: '5-8 years', prefix: 'Senior' },
  { id: 'staff', name: 'Staff / Principal', yearsExperience: '8-12 years', prefix: 'Staff' },
  { id: 'manager', name: 'Manager', yearsExperience: '5-10 years', prefix: '' },
  { id: 'senior_manager', name: 'Senior Manager / Director', yearsExperience: '10-15 years', prefix: 'Director of' },
  { id: 'vp', name: 'VP / Executive', yearsExperience: '12-20 years', prefix: 'VP of' },
  { id: 'c_level', name: 'C-Level', yearsExperience: '15+ years', prefix: '' },
];

// 7 Employment Types
export const EMPLOYMENT_TYPES: EmploymentType[] = [
  { id: 'full_time', name: 'Full-Time Employee', icon: '💼' },
  { id: 'part_time', name: 'Part-Time', icon: '⏰' },
  { id: 'contractor', name: 'Contractor / Freelance', icon: '📝' },
  { id: 'founder', name: 'Founder', icon: '🚀' },
  { id: 'self_employed', name: 'Self-Employed', icon: '🏠' },
  { id: 'student', name: 'Student', icon: '🎓' },
  { id: 'looking', name: 'Looking for Work', icon: '🔍' },
];

// Helper functions
export function getFunctionsForIndustry(industryId: string): JobFunction[] {
  const industry = INDUSTRIES.find(i => i.id === industryId);
  if (!industry) return JOB_FUNCTIONS;
  return JOB_FUNCTIONS.filter(f => industry.functions.includes(f.id));
}

export function getRolesForFunction(functionId: string, industryId?: string): Role[] {
  let roles = ROLES.filter(r => r.functionId === functionId);
  
  if (industryId) {
    roles = roles.filter(r => 
      r.applicableIndustries.length === 0 || 
      r.applicableIndustries.includes(industryId)
    );
  }
  
  return roles;
}

export function buildJobTitle(roleName: string, seniorityId: string): string {
  const seniority = SENIORITY_LEVELS.find(s => s.id === seniorityId);
  if (!seniority || !seniority.prefix) return roleName;
  
  // Special handling for certain roles
  if (roleName.includes('Manager') && seniority.prefix === 'Senior') {
    return `Senior ${roleName}`;
  }
  
  if (seniority.prefix === 'Director of' || seniority.prefix === 'VP of') {
    // Extract the function from role name
    const functionPart = roleName.replace(' Manager', '').replace(' Engineer', '');
    return `${seniority.prefix} ${functionPart}`;
  }
  
  if (seniority.prefix) {
    return `${seniority.prefix} ${roleName}`;
  }
  
  return roleName;
}
