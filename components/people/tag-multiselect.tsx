"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, X, Plus } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  category?: string | null;
  color?: string | null;
}

interface TagMultiselectProps {
  selectedTagIds: string[];
  onChange: (tagIds: string[]) => void;
  className?: string;
}

export default function TagMultiselect({
  selectedTagIds,
  onChange,
  className = "",
}: TagMultiselectProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [creatingTag, setCreatingTag] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTags();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowNewTagInput(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function loadTags() {
    try {
      const res = await fetch("/api/people/tags", { cache: "no-store" });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to load tags:", res.status, errorText);
        return;
      }

      const data = await res.json();
      if (data.ok && data.tags) {
        setTags(data.tags);
      } else {
        console.error("Invalid response format:", data);
      }
    } catch (err) {
      console.error("Failed to load tags:", err);
    } finally {
      setLoading(false);
    }
  }

  async function createTag() {
    if (!newTagName.trim()) return;

    setCreatingTag(true);
    try {
      const res = await fetch("/api/people/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (!res.ok) {
        let errorMessage = "Failed to create tag";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
          
          // Show helpful message if migration is needed
          if (errorData.migration_required) {
            alert("Tags feature requires a database migration. Please run the migration file: supabase/migrations/20251213_human_crm_foundation.sql");
          } else {
            alert(`Failed to create tag: ${errorMessage}`);
          }
        } catch {
          const errorText = await res.text();
          alert(`Failed to create tag: ${errorText}`);
        }
        console.error("Failed to create tag:", res.status, errorMessage);
        return;
      }

      const data = await res.json();
      if (data.ok && data.tag) {
        setTags([...tags, data.tag]);
        onChange([...selectedTagIds, data.tag.id]);
        setNewTagName("");
        setShowNewTagInput(false);
      } else {
        alert(`Failed to create tag: ${data.error || "Unknown error"}`);
      }
    } catch (err) {
      console.error("Failed to create tag:", err);
      alert(`Failed to create tag: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setCreatingTag(false);
    }
  }

  function toggleTag(tagId: string) {
    if (selectedTagIds.includes(tagId)) {
      onChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedTagIds, tagId]);
    }
  }

  function removeTag(tagId: string) {
    onChange(selectedTagIds.filter((id) => id !== tagId));
  }

  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));

  // Group ALL tags by category (both selected and unselected)
  const groupedTags: Record<string, Tag[]> = {};
  tags.forEach((tag) => {
    const category = tag.category || "Other";
    if (!groupedTags[category]) {
      groupedTags[category] = [];
    }
    groupedTags[category].push(tag);
  });

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <label className="block text-sm font-medium mb-1">Tags</label>
      
      {/* Selected tags display - clickable dropdown */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full min-h-[42px] px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white cursor-pointer hover:border-purple-500 focus:outline-none focus:border-purple-500 flex flex-wrap gap-2 items-center transition-colors"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <span
              key={tag.id}
              className="inline-flex items-center gap-1 px-2 py-1 bg-purple-600/30 text-purple-300 rounded text-xs"
            >
              {tag.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag.id);
                }}
                className="hover:bg-purple-600/50 rounded p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        ) : (
          <span className="text-gray-500 text-sm">Select tags...</span>
        )}
        <ChevronDown
          className={`w-4 h-4 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </div>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg max-h-64 overflow-y-auto">
          {loading ? (
            <div className="p-3 text-sm text-gray-400">Loading tags...</div>
          ) : (
            <>
              {/* Show tags if available, or empty state */}
              {tags.length === 0 ? (
                <div className="p-3 text-sm text-gray-400">
                  No tags available. Create your first tag below.
                </div>
              ) : (
                <>
                  {/* All tags grouped by category */}
                  {Object.keys(groupedTags).length > 0 ? (
                    Object.entries(groupedTags).map(([category, categoryTags]) => (
                      <div key={category}>
                        <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 bg-zinc-900/50 sticky top-0">
                          {category}
                        </div>
                        {categoryTags.map((tag) => {
                          const isSelected = selectedTagIds.includes(tag.id);
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => toggleTag(tag.id)}
                              className={`w-full text-left px-3 py-2 hover:bg-zinc-700 text-sm flex items-center gap-2 ${
                                isSelected ? "bg-purple-600/20" : ""
                              }`}
                            >
                              <div
                                className={`w-4 h-4 border-2 rounded flex items-center justify-center flex-shrink-0 ${
                                  isSelected
                                    ? "bg-purple-600 border-purple-600"
                                    : "border-zinc-600"
                                }`}
                              >
                                {isSelected && (
                                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                              <span className={isSelected ? "text-purple-300 font-medium" : ""}>{tag.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-gray-400">
                      No tags yet.
                    </div>
                  )}
                </>
              )}

              {/* Create new tag - Always visible at bottom */}
              <div className="border-t border-zinc-700 mt-1">
                {!showNewTagInput ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowNewTagInput(true);
                    }}
                    className="w-full text-left px-3 py-2.5 hover:bg-purple-600/20 active:bg-purple-600/30 text-sm flex items-center gap-2 bg-zinc-900/50"
                  >
                    <Plus className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <span className="text-purple-400 font-medium">Create new tag</span>
                  </button>
                ) : (
                  <div className="p-3">
                    <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          createTag();
                        } else if (e.key === "Escape") {
                          setShowNewTagInput(false);
                          setNewTagName("");
                        }
                      }}
                      placeholder="Tag name"
                      className="flex-1 px-2 py-1.5 bg-zinc-900 border border-zinc-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={createTag}
                      disabled={!newTagName.trim() || creatingTag}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm"
                    >
                      {creatingTag ? "..." : "Add"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewTagInput(false);
                        setNewTagName("");
                      }}
                      className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  </div>
                )}
              </div>

            </>
          )}
        </div>
      )}
    </div>
  );
}

