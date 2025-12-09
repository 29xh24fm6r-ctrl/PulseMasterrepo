// app/components/QuickCreateFAB.tsx
'use client';

import { useState } from 'react';
import { Plus, CheckSquare, Users, DollarSign, X } from 'lucide-react';
import CreateModal from './CreateModal';

type CreateType = 'task' | 'contact' | 'deal';

export default function QuickCreateFAB() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [modalType, setModalType] = useState<CreateType | null>(null);

  const openModal = (type: CreateType) => {
    setModalType(type);
    setIsMenuOpen(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-40">
        {/* Quick Menu */}
        {isMenuOpen && (
          <div className="absolute bottom-20 right-0 bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 p-2 mb-2 min-w-[200px]">
            <button
              onClick={() => openModal('task')}
              className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 rounded-xl transition-colors"
            >
              <CheckSquare className="w-5 h-5 text-blue-400" />
              <span className="font-medium">New Task</span>
            </button>
            <button
              onClick={() => openModal('contact')}
              className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 rounded-xl transition-colors"
            >
              <Users className="w-5 h-5 text-green-400" />
              <span className="font-medium">New Contact</span>
            </button>
            <button
              onClick={() => openModal('deal')}
              className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-gray-800 rounded-xl transition-colors"
            >
              <DollarSign className="w-5 h-5 text-yellow-400" />
              <span className="font-medium">New Deal</span>
            </button>
          </div>
        )}

        {/* Main Button */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-full shadow-2xl hover:from-purple-700 hover:to-pink-700 transition-all hover:scale-110 flex items-center justify-center group"
        >
          {isMenuOpen ? (
            <X className="w-7 h-7" />
          ) : (
            <Plus className="w-7 h-7 group-hover:rotate-90 transition-transform" />
          )}
        </button>
      </div>

      {/* Modal */}
      {modalType && (
        <CreateModal
          isOpen={!!modalType}
          onClose={() => setModalType(null)}
          type={modalType}
        />
      )}
    </>
  );
}
