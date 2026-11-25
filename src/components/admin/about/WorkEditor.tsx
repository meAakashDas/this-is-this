import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CmsWorkEntry } from '../../../types/cms/pages.ts';

interface WorkEditorProps {
  workEntries: CmsWorkEntry[];
  onChange: (updated: CmsWorkEntry[]) => void;
}

export const WorkEditor: React.FC<WorkEditorProps> = ({ workEntries, onChange }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newLinkText, setNewLinkText] = useState('');

  const handleUpdate = (index: number, field: keyof CmsWorkEntry, value: any) => {
    const updated = [...workEntries];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleUpdateLink = (index: number, field: 'text' | 'url', value: string) => {
    const updated = [...workEntries];
    const currentLink = updated[index].link || { text: '', url: '', isExternal: false };
    const newLink = { ...currentLink, [field]: value };
    newLink.isExternal = newLink.url.startsWith('http');

    if (!newLink.url.trim() && !newLink.text.trim()) {
      updated[index] = { ...updated[index], link: undefined };
    } else {
      updated[index] = { ...updated[index], link: newLink };
    }
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = workEntries
      .filter((_, i) => i !== index)
      .map((w, i) => ({
        ...w,
        order: i + 1,
        index: String(i + 1).padStart(2, '0'),
      }));
    onChange(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const newEntry: CmsWorkEntry = {
      id: `work-${Date.now()}`,
      index: String(workEntries.length + 1).padStart(2, '0'),
      name: newTitle.trim(),
      desc: newDesc.trim(),
      order: workEntries.length + 1,
      visible: true,
      ...(newUrl.trim()
        ? {
            link: {
              text: newLinkText.trim() || `Visit ${newTitle.trim()}`,
              url: newUrl.trim(),
              isExternal: newUrl.trim().startsWith('http'),
            },
          }
        : {}),
    };

    onChange([...workEntries, newEntry]);
    setNewTitle('');
    setNewDesc('');
    setNewUrl('');
    setNewLinkText('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {workEntries.map((item, index) => (
          <div
            key={item.id || index}
            className="rounded-lg border border-border bg-background p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground truncate">
                {item.name || `Work #${index + 1}`}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={`Delete work item ${index + 1}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 text-[11px] font-medium cursor-pointer shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Title
                </label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder="Initiative name"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={item.desc}
                  onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                  placeholder="Description..."
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Link Label (Optional)
                </label>
                <input
                  type="text"
                  value={item.link?.text || ''}
                  onChange={(e) => handleUpdateLink(index, 'text', e.target.value)}
                  placeholder="e.g. Visit RisePaisa"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Link URL (Optional)
                </label>
                <input
                  type="text"
                  value={item.link?.url || ''}
                  onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                  placeholder="https://... or /resources"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Initiative */}
      <form onSubmit={handleAdd} className="pt-3 border-t border-border/60 space-y-2.5">
        <span className="text-xs font-medium text-foreground block">Add Work Item</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Initiative title"
            aria-label="New work title"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 sm:col-span-2"
          />
          <textarea
            rows={2}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Brief description"
            aria-label="New work description"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y sm:col-span-2"
          />
          <input
            type="text"
            value={newLinkText}
            onChange={(e) => setNewLinkText(e.target.value)}
            placeholder="Link label (optional)"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL (optional)"
            className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <button
          type="submit"
          disabled={!newTitle.trim() || !newDesc.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Initiative</span>
        </button>
      </form>
    </div>
  );
};
