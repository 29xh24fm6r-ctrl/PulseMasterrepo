"use client";
import React, { useState, useEffect } from "react";
import { StickyNote, Plus, X, Trash2, Pin, PinOff } from "lucide-react";

interface Note {
  id: string;
  content: string;
  pinned: boolean;
  createdAt: string;
  color: string;
}

const COLORS = ["#fef08a", "#bbf7d0", "#bfdbfe", "#ddd6fe", "#fecaca", "#fed7aa"];

export function QuickNotesWidget() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  useEffect(() => {
    const saved = localStorage.getItem("pulse_quick_notes");
    if (saved) setNotes(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem("pulse_quick_notes", JSON.stringify(notes));
  }, [notes]);

  function addNote() {
    if (!newNote.trim()) return;
    const note: Note = {
      id: `n_${Date.now()}`,
      content: newNote.trim(),
      pinned: false,
      createdAt: new Date().toISOString(),
      color: selectedColor,
    };
    setNotes([note, ...notes]);
    setNewNote("");
    setIsAdding(false);
  }

  function deleteNote(id: string) {
    setNotes(notes.filter((n) => n.id !== id));
  }

  function togglePin(id: string) {
    setNotes(notes.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n));
  }

  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl border border-zinc-800/50 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-amber-400" />
          <h2 className="font-semibold">Quick Notes</h2>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Add Note Form */}
      {isAdding && (
        <div className="mb-4 space-y-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Write a quick note..."
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm resize-none focus:outline-none focus:border-amber-500"
            rows={3}
            autoFocus
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-5 h-5 rounded-full transition-transform ${selectedColor === color ? "scale-125 ring-2 ring-white" : ""}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
            <button
              onClick={addNote}
              disabled={!newNote.trim()}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-lg text-xs font-medium"
            >
              Add Note
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {sortedNotes.length === 0 ? (
        <div className="text-center py-6 text-zinc-600 text-sm">
          <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No notes yet</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sortedNotes.slice(0, 5).map((note) => (
            <div
              key={note.id}
              className="group relative p-3 rounded-lg text-sm"
              style={{ backgroundColor: `${note.color}15`, borderLeft: `3px solid ${note.color}` }}
            >
              <p className="text-zinc-300 pr-12 whitespace-pre-wrap">{note.content}</p>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => togglePin(note.id)}
                  className="p-1 hover:bg-zinc-700 rounded"
                >
                  {note.pinned ? <PinOff className="w-3 h-3 text-amber-400" /> : <Pin className="w-3 h-3 text-zinc-500" />}
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="p-1 hover:bg-zinc-700 rounded"
                >
                  <Trash2 className="w-3 h-3 text-red-400" />
                </button>
              </div>
              {note.pinned && (
                <Pin className="absolute top-2 right-2 w-3 h-3 text-amber-400 group-hover:opacity-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {notes.length > 5 && (
        <p className="text-xs text-zinc-500 text-center mt-3">
          +{notes.length - 5} more notes
        </p>
      )}
    </div>
  );
}

export default QuickNotesWidget;
