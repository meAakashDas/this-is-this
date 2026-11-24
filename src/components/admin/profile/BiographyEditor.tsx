import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, FileText, Check } from 'lucide-react';

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
    if (paragraphs.length <= 1) {
      alert('You must keep at least one biography paragraph.');
      return;
    }
    const updated = paragraphs.filter((_, i) => i !== index);
    onChange(updated);
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          Editorial Biography Paragraphs
        </h3>
        <p className="text-xs text-muted-foreground m-0">
          These paragraphs represent your narrative biography on the public About page.
          You can add, edit, reorder, and remove paragraphs.
        </p>
      </div>

      {/* Paragraphs List */}
      <div className="space-y-4">
        {paragraphs.map((p, index) => (
          <div
            key={index}
            className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-2xs transition-all"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <span className="text-xs font-mono font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-primary" />
                <span>Paragraph #{index + 1}</span>
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  title="Move paragraph up"
                  disabled={index === 0}
                  onClick={() => handleMoveUp(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Move paragraph down"
                  disabled={index === paragraphs.length - 1}
                  onClick={() => handleMoveDown(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Delete paragraph"
                  onClick={() => handleRemoveParagraph(index)}
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <textarea
              rows={4}
              value={p}
              onChange={(e) => handleUpdateParagraph(index, e.target.value)}
              className="w-full text-xs font-normal leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
              placeholder="Enter biography paragraph..."
            />

            <div className="text-[11px] font-mono text-muted-foreground/70 text-right">
              {p.length} characters • ~{Math.ceil(p.split(/\s+/).filter(Boolean).length)} words
            </div>
          </div>
        ))}
      </div>

      {/* Add New Paragraph Card */}
      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 space-y-3">
        <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-primary" />
          <span>Add New Paragraph</span>
        </label>
        <textarea
          rows={3}
          value={newParagraph}
          onChange={(e) => setNewParagraph(e.target.value)}
          placeholder="Type the next paragraph of your biography..."
          className="w-full text-xs font-normal leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-y"
        />
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!newParagraph.trim()}
            onClick={handleAddParagraph}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Paragraph</span>
          </button>
        </div>
      </div>
    </div>
  );
};
