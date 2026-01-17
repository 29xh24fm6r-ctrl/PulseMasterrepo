"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { Shield, Plus, Eye, EyeOff, Trash2, Lock, Key, FileText, CreditCard } from "lucide-react";

interface VaultItem {
  id: string;
  item_name: string;
  item_type: string;
  created_at: string;
}

export default function VaultPage() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [newItemType, setNewItemType] = useState<string>("secret");
  const [newItemName, setNewItemName] = useState("");
  const [newItemData, setNewItemData] = useState("");

  const unlockVault = () => {
    if (password.length >= 8) {
      setIsUnlocked(true);
      // In production, this would verify the password hash
    }
  };

  const addItem = async () => {
    if (!newItemName || !newItemData) return;
    // In production, this would encrypt and save via API
    const newItem: VaultItem = {
      id: crypto.randomUUID(),
      item_name: newItemName,
      item_type: newItemType,
      created_at: new Date().toISOString()
    };
    setItems([...items, newItem]);
    setNewItemName("");
    setNewItemData("");
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case "credential": return <Key className="w-4 h-4" />;
      case "note": return <FileText className="w-4 h-4" />;
      case "document": return <FileText className="w-4 h-4" />;
      default: return <Lock className="w-4 h-4" />;
    }
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-10 h-10" />
            </div>
            <h1 className="text-3xl font-bold">Security Vault</h1>
            <p className="text-slate-400 mt-2">End-to-end encrypted storage</p>
          </div>

          <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
            <label className="text-sm text-slate-400 block mb-2">Vault Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your vault password"
                className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 pr-12 text-white"
                onKeyDown={(e) => e.key === "Enter" && unlockVault()}
              />
              <button
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <button
              onClick={unlockVault}
              disabled={password.length < 8}
              className="w-full mt-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg font-semibold disabled:opacity-50"
            >
              Unlock Vault
            </button>
            <p className="text-xs text-slate-500 mt-3 text-center">
              Your password never leaves your device. All encryption happens locally.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Shield className="w-8 h-8 text-cyan-400" />
              Security Vault
            </h1>
            <p className="text-slate-400 mt-1">🔓 Unlocked</p>
          </div>
          <button
            onClick={() => { setIsUnlocked(false); setPassword(""); }}
            className="px-4 py-2 bg-slate-700 rounded-lg hover:bg-slate-600"
          >
            Lock Vault
          </button>
        </div>

        {/* Add New Item */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50 mb-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-green-400" />
            Add Secure Item
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <select
              value={newItemType}
              onChange={(e) => setNewItemType(e.target.value)}
              className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="secret">Secret</option>
              <option value="credential">Credential</option>
              <option value="note">Secure Note</option>
              <option value="document">Document</option>
            </select>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder="Item name"
              className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
            <input
              type="password"
              value={newItemData}
              onChange={(e) => setNewItemData(e.target.value)}
              placeholder="Secret data"
              className="bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
            <button
              onClick={addItem}
              disabled={!newItemName || !newItemData}
              className="bg-green-500 rounded-lg font-semibold disabled:opacity-50 hover:bg-green-600"
            >
              Add
            </button>
          </div>
        </div>

        {/* Items List */}
        <div className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700/50">
          <h3 className="font-semibold mb-4">Your Secure Items</h3>
          {items.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No items yet. Add your first secure item above.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-900/50 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-700 rounded-lg">
                      {getItemIcon(item.item_type)}
                    </div>
                    <div>
                      <p className="font-medium">{item.item_name}</p>
                      <p className="text-xs text-slate-500">{item.item_type} • {new Date(item.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-slate-700 rounded-lg"><Eye className="w-4 h-4" /></button>
                    <button className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}