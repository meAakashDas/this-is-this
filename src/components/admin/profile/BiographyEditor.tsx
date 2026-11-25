import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

interface BiographyEditorProps {
  paragraphs: string[];
  onChange: (paragraphs: string[]) => void;
}

export const BiographyEditor: React.FC<BiographyEditorProps> = ({
  paragraphs,
  onChange,
}) => {
  const [newParagraph, setNewParagraph] = useState('');

  const handleUpdateParagraph = (index: number, value: string) => {
    const updated = [...paragraphs];
    updated[index] = value;
    onChange(updated);
  };

  const handleRemoveParagraph = (index: number) => {
    if (paragraphs.length <= 1) return;
    onChange(paragraphs.filter((_, i) => i !== index));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...paragraphs];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === paragraphs.length - 1) return;
    const updated = [...paragraphs];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  };

  const handleAddParagraph = () => {
    if (!newParagraph.trim()) return;
    onChange([...paragraphs, newParagraph.trim()]);
    setNewParagraph('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {paragraphs.map((p, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-background p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono text-muted-foreground">
                Paragraph #{index + 1}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Move up"
                  aria-label={`Move paragraph ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => handleMoveUp(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Move down"
                  aria-label={`Move paragraph ${index + 1} down`}
                  disabled={index === paragraphs.length - 1}
                  onClick={() => handleMoveDown(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete paragraph"
                  aria-label={`Delete paragraph ${index + 1}`}
                  disabled={paragraphs.length <= 1}
                  onClick={() => handleRemoveParagraph(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 disabled:opacity-30 cursor-pointer ml-0.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              rows={3}
              value={p}
              onChange={(e) => handleUpdateParagraph(index, e.target.value)}
              className="w-full text-xs leading-relaxed rounded-lg border border-input bg-card px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y"
              placeholder="Enter biography paragraph..."
            />
          </div>
        ))}
      </div>

      {/* Add Paragraph */}
      <div className="pt-2 space-y-2 border-t border-border/60">
        <label htmlFor="profile-new-paragraph" className="text-xs font-medium text-foreground block">
          Add Paragraph
        </label>
        <textarea
          id="profile-new-paragraph"
          rows={2}
          value={newParagraph}
          onChange={(e) => setNewParagraph(e.target.value)}
          placeholder="Write a new biography paragraph..."
          className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y"
        />
        <button
          type="button"
          disabled={!newParagraph.trim()}
          onClick={handleAddParagraph}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Paragraph</span>
        </button>
      </div>
    </div>
  );
};
