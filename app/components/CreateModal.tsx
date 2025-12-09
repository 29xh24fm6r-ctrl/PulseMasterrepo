// app/components/CreateModal.tsx
'use client';

import { useState } from 'react';
import { X, Sparkles, Loader2, CheckCircle } from 'lucide-react';

type CreateType = 'task' | 'contact' | 'deal';

interface CreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: CreateType;
}

export default function CreateModal({ isOpen, onClose, type }: CreateModalProps) {
  // For tasks
  const [input, setInput] = useState('');
  
  // For contacts
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  
  // For deals
  const [dealCompany, setDealCompany] = useState('');
  const [dealContactName, setDealContactName] = useState('');
  const [dealContactEmail, setDealContactEmail] = useState('');
  const [dealName, setDealName] = useState('');
  const [dealValue, setDealValue] = useState('');
  const [dealStage, setDealStage] = useState('Prospecting');
  const [dealCloseDate, setDealCloseDate] = useState('');
  const [dealSource, setDealSource] = useState('');
  const [dealNotes, setDealNotes] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [aiData, setAiData] = useState<any>(null);

  if (!isOpen) return null;

  const config = {
    task: {
      title: '✅ Create Task',
      endpoint: '/api/tasks/create',
    },
    contact: {
      title: '👤 Add Contact',
      endpoint: '/api/second-brain/create',
    },
    deal: {
      title: '💰 Create Deal',
      endpoint: '/api/deals/create',
    }
  }[type];

  const resetForm = () => {
    setInput('');
    setFirstName('');
    setLastName('');
    setContactCompany('');
    setContactEmail('');
    setContactPhone('');
    setDealCompany('');
    setDealContactName('');
    setDealContactEmail('');
    setDealName('');
    setDealValue('');
    setDealStage('Prospecting');
    setDealCloseDate('');
    setDealSource('');
    setDealNotes('');
    setSuccess(false);
    setAiData(null);
    setError('');
  };

  const isFormValid = () => {
    if (type === 'task') return input.trim().length > 0;
    if (type === 'contact') return firstName.trim().length > 0 && lastName.trim().length > 0;
    if (type === 'deal') return dealCompany.trim().length > 0 && dealName.trim().length > 0;
    return false;
  };

  const handleCreate = async () => {
    if (!isFormValid()) {
      if (type === 'contact') setError('First and last name are required');
      if (type === 'deal') setError('Company and deal name are required');
      return;
    }

    setLoading(true);
    setError('');
    setAiData(null);

    try {
      let payload;
      
      if (type === 'task') {
        payload = {
          taskInput: input,
          useAI: true
        };
      } else if (type === 'contact') {
        payload = {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          company: contactCompany.trim(),
          email: contactEmail.trim(),
          phone: contactPhone.trim(),
          useAI: true,
          autoResearch: true
        };
      } else if (type === 'deal') {
        payload = {
          companyName: dealCompany.trim(),
          contactName: dealContactName.trim(),
          contactEmail: dealContactEmail.trim(),
          dealName: dealName.trim(),
          estimatedValue: dealValue ? parseFloat(dealValue.replace(/[^0-9.]/g, '')) : 0,
          stage: dealStage,
          expectedCloseDate: dealCloseDate || null,
          source: dealSource.trim(),
          notes: dealNotes.trim(),
          useAI: true
        };
      }

      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setAiData(data[type] || data.task || data.contact || data.deal);
        setTimeout(() => {
          onClose();
          resetForm();
        }, 2500);
      } else {
        setError(data.error || 'Failed to create');
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && type === 'task') {
      e.preventDefault();
      handleCreate();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{config.title}</h2>
              <p className="text-sm text-gray-400">
                {type === 'task' && 'AI will enhance your input automatically'}
                {type === 'contact' && 'Enter details - AI will research and enrich'}
                {type === 'deal' && 'Enter details - AI will research the company'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { onClose(); resetForm(); }}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          
          {/* TASK FORM */}
          {type === 'task' && (
            <div className="mb-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder='e.g., "Follow up with John about proposal by Friday"'
                className="w-full bg-gray-800 text-white rounded-xl p-4 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                rows={3}
                disabled={loading || success}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: Just type naturally - AI extracts priority, due date, and category
              </p>
            </div>
          )}

          {/* CONTACT FORM */}
          {type === 'contact' && (
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                    className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    disabled={loading || success}
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                    className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    disabled={loading || success}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm text-gray-400 mb-1">Company</label>
                <input
                  type="text"
                  value={contactCompany}
                  onChange={(e) => setContactCompany(e.target.value)}
                  placeholder="Acme Corp"
                  className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  disabled={loading || success}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="john@acme.com"
                    className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    disabled={loading || success}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    disabled={loading || success}
                  />
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                🔮 AI will search LinkedIn and the web to find their title, industry, and professional background
              </p>
            </div>
          )}

          {/* DEAL FORM */}
          {type === 'deal' && (
            <div className="space-y-4 mb-4">
              {/* Company & Contact Section */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Company & Contact</h3>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Company Name *</label>
                  <input
                    type="text"
                    value={dealCompany}
                    onChange={(e) => setDealCompany(e.target.value)}
                    placeholder="Acme Corporation"
                    className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    disabled={loading || success}
                    autoFocus
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={dealContactName}
                      onChange={(e) => setDealContactName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      disabled={loading || success}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={dealContactEmail}
                      onChange={(e) => setDealContactEmail(e.target.value)}
                      placeholder="john@acme.com"
                      className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      disabled={loading || success}
                    />
                  </div>
                </div>
              </div>

              {/* Deal Details Section */}
              <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Deal Details</h3>
                
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Deal Name / Description *</label>
                  <input
                    type="text"
                    value={dealName}
                    onChange={(e) => setDealName(e.target.value)}
                    placeholder="Website Redesign Project"
                    className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    disabled={loading || success}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Estimated Value ($)</label>
                    <input
                      type="text"
                      value={dealValue}
                      onChange={(e) => setDealValue(e.target.value)}
                      placeholder="25000"
                      className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      disabled={loading || success}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Stage</label>
                    <select
                      value={dealStage}
                      onChange={(e) => setDealStage(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      disabled={loading || success}
                    >
                      <option value="Prospecting">Prospecting</option>
                      <option value="Qualification">Qualification</option>
                      <option value="Proposal">Proposal</option>
                      <option value="Negotiation">Negotiation</option>
                      <option value="Closed Won">Closed Won</option>
                      <option value="Closed Lost">Closed Lost</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Expected Close Date</label>
                    <input
                      type="date"
                      value={dealCloseDate}
                      onChange={(e) => setDealCloseDate(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      disabled={loading || success}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Source</label>
                    <select
                      value={dealSource}
                      onChange={(e) => setDealSource(e.target.value)}
                      className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      disabled={loading || success}
                    >
                      <option value="">Select source...</option>
                      <option value="Referral">Referral</option>
                      <option value="Cold Outreach">Cold Outreach</option>
                      <option value="Inbound">Inbound</option>
                      <option value="Website">Website</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Event">Event</option>
                      <option value="Partner">Partner</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes / Background</label>
                <textarea
                  value={dealNotes}
                  onChange={(e) => setDealNotes(e.target.value)}
                  placeholder="Any additional context about this deal..."
                  className="w-full bg-gray-800 text-white rounded-xl p-3 border border-gray-700 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                  rows={3}
                  disabled={loading || success}
                />
              </div>
              
              <p className="text-xs text-gray-500">
                🔮 AI will research the company, validate value estimates, and add industry intelligence
              </p>
            </div>
          )}

          {/* Success Preview */}
          {aiData && success && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 text-green-400 font-semibold mb-2">
                <CheckCircle className="w-5 h-5" />
                Created Successfully!
              </div>
              <div className="text-sm text-gray-300 space-y-1">
                {type === 'task' && (
                  <>
                    <p><strong>Task:</strong> {aiData.title}</p>
                    <p><strong>Priority:</strong> {aiData.priority}</p>
                    {aiData.dueDate && <p><strong>Due:</strong> {new Date(aiData.dueDate).toLocaleDateString()}</p>}
                  </>
                )}
                {type === 'contact' && (
                  <>
                    <p><strong>Name:</strong> {aiData.name}</p>
                    {aiData.company && <p><strong>Company:</strong> {aiData.company}</p>}
                    {aiData.title && <p><strong>Title:</strong> {aiData.title}</p>}
                    {aiData.industry && <p><strong>Industry:</strong> {aiData.industry}</p>}
                    {aiData.notes && <p><strong>AI Intel:</strong> {aiData.notes}</p>}
                  </>
                )}
                {type === 'deal' && (
                  <>
                    <p><strong>Deal:</strong> {aiData.title}</p>
                    <p><strong>Company:</strong> {aiData.company}</p>
                    {aiData.value > 0 && <p><strong>Value:</strong> ${aiData.value.toLocaleString()}</p>}
                    <p><strong>Stage:</strong> {aiData.stage}</p>
                    {aiData.industry && <p><strong>Industry:</strong> {aiData.industry}</p>}
                    {aiData.aiInsights && <p><strong>AI Intel:</strong> {aiData.aiInsights}</p>}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              disabled={!isFormValid() || loading || success}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl py-3 font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {type === 'deal' ? 'AI researching company...' : type === 'contact' ? 'AI researching...' : 'AI is working...'}
                </>
              ) : success ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Created!
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {type === 'deal' ? 'Create & Research' : type === 'contact' ? 'Create & Research' : 'Create with AI'}
                </>
              )}
            </button>
            <button
              onClick={() => { onClose(); resetForm(); }}
              className="px-6 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
          </div>

          {type === 'task' && (
            <p className="text-xs text-gray-500 text-center mt-4">
              Press <kbd className="px-2 py-1 bg-gray-800 rounded text-gray-400">Enter</kbd> to create
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
