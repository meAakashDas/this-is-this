import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
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

  const handleUpdateLink = (
    index: number,
    field: 'text' | 'url',
    value: string
  ) => {
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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...workEntries];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    // Renumber automatically
    updated.forEach((w, i) => {
      w.order = i + 1;
      w.index = String(i + 1).padStart(2, '0');
    });
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === workEntries.length - 1) return;
    const updated = [...workEntries];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    // Renumber automatically
    updated.forEach((w, i) => {
      w.order = i + 1;
      w.index = String(i + 1).padStart(2, '0');
    });
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = workEntries.filter((_, i) => i !== index);
    updated.forEach((w, i) => {
      w.order = i + 1;
      w.index = String(i + 1).padStart(2, '0');
    });
    onChange(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    const nextIndex = String(workEntries.length + 1).padStart(2, '0');
    const newEntry: CmsWorkEntry = {
      id: `work-${Date.now()}`,
      index: nextIndex,
      name: newTitle.trim(),
      desc: newDesc.trim(),
      order: workEntries.length + 1,
      visible: true,
      link: newUrl.trim()
        ? {
            text: newLinkText.trim() || `Visit ${newTitle.trim()}`,
            url: newUrl.trim(),
            isExternal: newUrl.startsWith('http'),
          }
        : undefined,
    };

    onChange([...workEntries, newEntry]);
    setNewTitle('');
    setNewDesc('');
    setNewUrl('');
    setNewLinkText('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          My Work
        </h3>
        <p className="text-xs text-muted-foreground m-0">
          Manage featured initiatives and projects.
        </p>
      </div>

      {/* Initiatives List */}
      <div className="space-y-4">
        {workEntries.map((item, index) => (
          <div
            key={item.id || index}
            className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-border bg-secondary text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold text-foreground">
                  {item.name || `Initiative ${index + 1}`}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  title="Move up"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === workEntries.length - 1}
                  title="Move down"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  title="Delete initiative"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Initiative Name
                </label>
                <input
                  type="text"
                  value={item.name}
                  onChange={(e) => handleUpdate(index, 'name', e.target.value)}
                  placeholder="Initiative name"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={item.desc}
                  onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                  placeholder="Initiative description..."
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground block">
                    Button Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={item.link?.text || ''}
                    onChange={(e) => handleUpdateLink(index, 'text', e.target.value)}
                    placeholder="e.g. Visit RisePaisa"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground block">
                    Destination URL (Optional)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={item.link?.url || ''}
                      onChange={(e) => handleUpdateLink(index, 'url', e.target.value)}
                      placeholder="e.g. https://risepaisa.com or /resources"
                      className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    {item.link?.url && (
                      <a
                        href={item.link.url}
                        target={item.link.url.startsWith('http') ? '_blank' : undefined}
                        rel={item.link.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                        className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Initiative Form */}
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-5 space-y-4">
        <h4 className="text-xs font-semibold text-foreground m-0">
          Add New Initiative
        </h4>

        <form onSubmit={handleAdd} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Initiative Name
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. New Project"
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Description
            </label>
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Brief description of the initiative..."
              className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block">
                Button Label (Optional)
              </label>
              <input
                type="text"
                value={newLinkText}
                onChange={(e) => setNewLinkText(e.target.value)}
                placeholder="e.g. Explore Initiative"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block">
                Destination URL (Optional)
              </label>
              <input
                type="text"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="e.g. https://example.com"
                className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!newTitle.trim() || !newDesc.trim()}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Initiative</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
