// Decision Theater - Decision Capture Dialog Component
// components/decision-theater/DecisionCaptureDialog.tsx

'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface DecisionCaptureDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (params: {
    decisionLabel: string;
    userChoice: string;
    userNotes?: string;
  }) => Promise<void>;
  defaultRecommendation?: string;
  choiceType: 'follow' | 'other' | 'undecided';
}

export function DecisionCaptureDialog({
  open,
  onClose,
  onSave,
  defaultRecommendation,
  choiceType,
}: DecisionCaptureDialogProps) {
  const [decisionLabel, setDecisionLabel] = useState(defaultRecommendation || '');
  const [userNotes, setUserNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const handleSave = async () => {
    if (!decisionLabel.trim()) {
      alert('Please enter a decision label');
      return;
    }

    setSaving(true);
    try {
      const userChoice =
        choiceType === 'follow'
          ? 'follow'
          : choiceType === 'other'
          ? 'other'
          : 'undecided';

      await onSave({
        decisionLabel: decisionLabel.trim(),
        userChoice,
        userNotes: userNotes.trim() || undefined,
      });

      setDecisionLabel('');
      setUserNotes('');
      onClose();
    } catch (err) {
      console.error('Failed to save decision', err);
      alert('Failed to save decision. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Capture Your Decision</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={saving}
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Decision Label *
            </label>
            <input
              type="text"
              value={decisionLabel}
              onChange={(e) => setDecisionLabel(e.target.value)}
              placeholder="e.g., Stay at Old Glory for 12 more months"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Any additional thoughts or context..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={saving}
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={saving || !decisionLabel.trim()}
          >
            {saving ? 'Saving...' : 'Save Decision'}
          </button>
        </div>
      </div>
    </div>
  );
}


