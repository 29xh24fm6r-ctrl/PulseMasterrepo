"use client";

import { useState, useMemo } from "react";
import {
  INDUSTRIES,
  JOB_FUNCTIONS,
  ROLES,
  SENIORITY_LEVELS,
  EMPLOYMENT_TYPES,
  getFunctionsForIndustry,
  getRolesForFunction,
  buildJobTitle,
  Industry,
  JobFunction,
  Role,
  SeniorityLevel,
  EmploymentType,
} from "@/lib/career/job-taxonomy";
import { JobSelectionResult } from "@/lib/career/job-model";

interface Props {
  onComplete: (result: JobSelectionResult) => void;
}

type Step = 'industry' | 'function' | 'role' | 'seniority' | 'employment' | 'company' | 'confirm';

const STEPS: Step[] = ['industry', 'function', 'role', 'seniority', 'employment', 'company', 'confirm'];

export default function CascadingJobSelector({ onComplete }: Props) {
  const [currentStep, setCurrentStep] = useState<Step>('industry');
  const [search, setSearch] = useState('');
  
  // Selections
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<JobFunction | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedSeniority, setSelectedSeniority] = useState<SeniorityLevel | null>(null);
  const [selectedEmployment, setSelectedEmployment] = useState<EmploymentType | null>(null);
  const [company, setCompany] = useState('');
  
  // Computed values
  const availableFunctions = useMemo(() => {
    if (!selectedIndustry) return [];
    return getFunctionsForIndustry(selectedIndustry.id);
  }, [selectedIndustry]);
  
  const availableRoles = useMemo(() => {
    if (!selectedFunction) return [];
    return getRolesForFunction(selectedFunction.id, selectedIndustry?.id);
  }, [selectedFunction, selectedIndustry]);
  
  const fullTitle = useMemo(() => {
    if (!selectedRole || !selectedSeniority) return '';
    return buildJobTitle(selectedRole.name, selectedSeniority.id);
  }, [selectedRole, selectedSeniority]);
  
  const stepIndex = STEPS.indexOf(currentStep);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;
  
  function selectIndustry(industry: Industry) {
    setSelectedIndustry(industry);
    setSelectedFunction(null);
    setSelectedRole(null);
    setSearch('');
    setTimeout(() => setCurrentStep('function'), 200);
  }
  
  function selectFunction(fn: JobFunction) {
    setSelectedFunction(fn);
    setSelectedRole(null);
    setSearch('');
    setTimeout(() => setCurrentStep('role'), 200);
  }
  
  function selectRole(role: Role) {
    setSelectedRole(role);
    setSearch('');
    setTimeout(() => setCurrentStep('seniority'), 200);
  }
  
  function selectSeniority(seniority: SeniorityLevel) {
    setSelectedSeniority(seniority);
    setTimeout(() => setCurrentStep('employment'), 200);
  }
  
  function selectEmployment(employment: EmploymentType) {
    setSelectedEmployment(employment);
    setTimeout(() => setCurrentStep('company'), 200);
  }
  
  function goBack() {
    const idx = STEPS.indexOf(currentStep);
    if (idx > 0) {
      setCurrentStep(STEPS[idx - 1]);
    }
  }
  
  function skipCompany() {
    setCurrentStep('confirm');
  }
  
  function handleConfirm() {
    if (!selectedIndustry || !selectedFunction || !selectedRole || !selectedSeniority || !selectedEmployment) {
      return;
    }
    
    const result: JobSelectionResult = {
      industryId: selectedIndustry.id,
      industryName: selectedIndustry.name,
      functionId: selectedFunction.id,
      functionName: selectedFunction.name,
      roleId: selectedRole.id,
      roleName: selectedRole.name,
      seniorityId: selectedSeniority.id,
      seniorityName: selectedSeniority.name,
      employmentTypeId: selectedEmployment.id,
      employmentTypeName: selectedEmployment.name,
      fullTitle,
      company: company || undefined,
      typicalOutcomes: selectedRole.typicalOutcomes,
      coreSkills: selectedRole.coreSkills,
      dailyActivities: selectedRole.dailyActivities,
    };
    
    onComplete(result);
  }
  
  // Filter helpers
  const filterItems = <T extends { name: string }>(items: T[], searchTerm: string): T[] => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(item => item.name.toLowerCase().includes(lower));
  };
  
  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
      {/* Progress Bar */}
      <div className="h-1 bg-zinc-800">
        <div 
          className="h-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      {/* Breadcrumb */}
      <div className="px-6 pt-4 flex items-center gap-2 text-sm text-zinc-500 flex-wrap">
        {selectedIndustry && (
          <>
            <span className="text-violet-400">{selectedIndustry.name}</span>
            {selectedFunction && <span>→</span>}
          </>
        )}
        {selectedFunction && (
          <>
            <span className="text-cyan-400">{selectedFunction.name}</span>
            {selectedRole && <span>→</span>}
          </>
        )}
        {selectedRole && (
          <span className="text-green-400">{selectedRole.name}</span>
        )}
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Industry Selection */}
        {currentStep === 'industry' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">What industry do you work in?</h2>
            <p className="text-zinc-400 text-sm mb-4">Select your primary industry</p>
            
            <input
              type="text"
              placeholder="Search industries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 mb-4 focus:outline-none focus:border-violet-500"
            />
            
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {filterItems(INDUSTRIES, search).map((industry) => (
                <button
                  key={industry.id}
                  onClick={() => selectIndustry(industry)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedIndustry?.id === industry.id
                      ? 'bg-violet-500/20 border-violet-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  <span className="text-xl mr-2">{industry.icon}</span>
                  <span>{industry.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Function Selection */}
        {currentStep === 'function' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">What's your job function?</h2>
            <p className="text-zinc-400 text-sm mb-4">Select your primary function</p>
            
            <input
              type="text"
              placeholder="Search functions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 mb-4 focus:outline-none focus:border-cyan-500"
            />
            
            <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
              {filterItems(availableFunctions, search).map((fn) => (
                <button
                  key={fn.id}
                  onClick={() => selectFunction(fn)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedFunction?.id === fn.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-600'
                  }`}
                >
                  {fn.name}
                </button>
              ))}
            </div>
            
            <button
              onClick={goBack}
              className="mt-4 text-zinc-400 hover:text-white text-sm"
            >
              ← Back
            </button>
          </div>
        )}
        
        {/* Role Selection */}
        {currentStep === 'role' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">What's your specific role?</h2>
            <p className="text-zinc-400 text-sm mb-4">Select the closest match</p>
            
            <input
              type="text"
              placeholder="Search roles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 mb-4 focus:outline-none focus:border-green-500"
            />
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {filterItems(availableRoles, search).map((role) => (
                <button
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    selectedRole?.id === role.id
                      ? 'bg-green-500/20 border-green-500'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-medium text-white">{role.name}</div>
                  <div className="text-xs text-zinc-500 mt-1">{role.description}</div>
                  {role.alternativeTitles.length > 0 && (
                    <div className="text-xs text-zinc-600 mt-1">
                      Also: {role.alternativeTitles.join(', ')}
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            <button
              onClick={goBack}
              className="mt-4 text-zinc-400 hover:text-white text-sm"
            >
              ← Back
            </button>
          </div>
        )}
        
        {/* Seniority Selection */}
        {currentStep === 'seniority' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">What's your seniority level?</h2>
            <p className="text-zinc-400 text-sm mb-4">Select your current level</p>
            
            <div className="space-y-2">
              {SENIORITY_LEVELS.map((level) => (
                <button
                  key={level.id}
                  onClick={() => selectSeniority(level)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    selectedSeniority?.id === level.id
                      ? 'bg-amber-500/20 border-amber-500'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="font-medium text-white">{level.name}</div>
                  <div className="text-xs text-zinc-500">{level.yearsExperience}</div>
                </button>
              ))}
            </div>
            
            <button
              onClick={goBack}
              className="mt-4 text-zinc-400 hover:text-white text-sm"
            >
              ← Back
            </button>
          </div>
        )}
        
        {/* Employment Type Selection */}
        {currentStep === 'employment' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">What's your employment type?</h2>
            <p className="text-zinc-400 text-sm mb-4">Select your current status</p>
            
            <div className="grid grid-cols-2 gap-2">
              {EMPLOYMENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => selectEmployment(type)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    selectedEmployment?.id === type.id
                      ? 'bg-blue-500/20 border-blue-500'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <span className="text-xl mr-2">{type.icon}</span>
                  <span className="text-white">{type.name}</span>
                </button>
              ))}
            </div>
            
            <button
              onClick={goBack}
              className="mt-4 text-zinc-400 hover:text-white text-sm"
            >
              ← Back
            </button>
          </div>
        )}
        
        {/* Company Name */}
        {currentStep === 'company' && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-2">Where do you work? (Optional)</h2>
            <p className="text-zinc-400 text-sm mb-4">Your company name helps personalize coaching</p>
            
            <input
              type="text"
              placeholder="Company name"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 mb-4 focus:outline-none focus:border-violet-500"
            />
            
            <div className="flex gap-3">
              <button
                onClick={skipCompany}
                className="flex-1 py-3 bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => setCurrentStep('confirm')}
                className="flex-1 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-500 transition-colors"
              >
                Continue
              </button>
            </div>
            
            <button
              onClick={goBack}
              className="mt-4 text-zinc-400 hover:text-white text-sm"
            >
              ← Back
            </button>
          </div>
        )}
        
        {/* Confirmation */}
        {currentStep === 'confirm' && selectedRole && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">Confirm your profile</h2>
            
            <div className="bg-zinc-800 rounded-xl p-5 mb-6">
              <div className="text-2xl font-bold text-white mb-1">{fullTitle}</div>
              {company && <div className="text-violet-400 mb-3">at {company}</div>}
              
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs rounded-full">
                  {selectedIndustry?.name}
                </span>
                <span className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs rounded-full">
                  {selectedFunction?.name}
                </span>
                <span className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs rounded-full">
                  {selectedSeniority?.name}
                </span>
                <span className="px-2 py-1 bg-zinc-700 text-zinc-300 text-xs rounded-full">
                  {selectedEmployment?.name}
                </span>
              </div>
              
              <div className="text-sm text-zinc-400 mb-3">
                <strong className="text-zinc-300">Success looks like:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRole.typicalOutcomes.slice(0, 3).map((outcome, i) => (
                    <span key={i} className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
                      {outcome}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="text-sm text-zinc-400">
                <strong className="text-zinc-300">Core skills:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selectedRole.coreSkills.slice(0, 4).map((skill, i) => (
                    <span key={i} className="px-2 py-0.5 bg-violet-500/20 text-violet-400 text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleConfirm}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-violet-500 hover:to-cyan-500 transition-all"
            >
              Start Coaching →
            </button>
            
            <button
              onClick={goBack}
              className="w-full mt-3 text-zinc-400 hover:text-white text-sm"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
