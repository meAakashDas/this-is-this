import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, ExternalLink } from 'lucide-react';
import type { CmsMediaEntry } from '../../../types/cms/pages.ts';

interface MediaMentionsEditorProps {
  mediaEntries: CmsMediaEntry[];
  onChange: (updated: CmsMediaEntry[]) => void;
}

export const MediaMentionsEditor: React.FC<MediaMentionsEditorProps> = ({
  mediaEntries,
  onChange,
}) => {
  const [newShow, setNewShow] = useState('');
  const [newRole, setNewRole] = useState('Podcast Guest');
  const [newFormat, setNewFormat] = useState('Featured Interview');
  const [newDesc, setNewDesc] = useState('');
  const [newUrl, setNewUrl] = useState('');

  const handleUpdate = (index: number, field: keyof CmsMediaEntry, value: any) => {
    const updated = [...mediaEntries];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...mediaEntries];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updated.forEach((m, i) => {
      m.order = i + 1;
    });
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === mediaEntries.length - 1) return;
    const updated = [...mediaEntries];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updated.forEach((m, i) => {
      m.order = i + 1;
    });
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = mediaEntries.filter((_, i) => i !== index);
    updated.forEach((m, i) => {
      m.order = i + 1;
    });
    onChange(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newShow.trim() || !newDesc.trim()) return;

    const newEntry: CmsMediaEntry = {
      id: `media-${Date.now()}`,
      show: newShow.trim(),
      role: newRole.trim() || 'Podcast Guest',
      format: newFormat.trim() || 'Featured Interview',
      desc: newDesc.trim(),
      url: newUrl.trim() || undefined,
      order: mediaEntries.length + 1,
      visible: true,
    };

    onChange([...mediaEntries, newEntry]);
    setNewShow('');
    setNewRole('Podcast Guest');
    setNewFormat('Featured Interview');
    setNewDesc('');
    setNewUrl('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          Conversations & Media
        </h3>
        <p className="text-xs text-muted-foreground m-0">
          Manage featured podcast appearances and media interviews.
        </p>
      </div>

      {/* Appearances List */}
      <div className="space-y-4">
        {mediaEntries.map((item, index) => (
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
                  {item.show || `Appearance ${index + 1}`}
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
                  disabled={index === mediaEntries.length - 1}
                  title="Move down"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  title="Delete appearance"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Show / Event Name
                  </label>
                  <input
                    type="text"
                    value={item.show}
                    onChange={(e) => handleUpdate(index, 'show', e.target.value)}
                    placeholder="e.g. The Amit Show"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Role Label
                  </label>
                  <input
                    type="text"
                    value={item.role}
                    onChange={(e) => handleUpdate(index, 'role', e.target.value)}
                    placeholder="e.g. Podcast Guest"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Format Tag
                  </label>
                  <input
                    type="text"
                    value={item.format}
                    onChange={(e) => handleUpdate(index, 'format', e.target.value)}
                    placeholder="e.g. Featured Interview"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={item.desc}
                  onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                  placeholder="Conversation overview and topic highlights..."
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Media / Episode URL (Optional)
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={item.url || ''}
                    onChange={(e) => handleUpdate(index, 'url', e.target.value)}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {item.url && (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Appearance Form */}
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-5 space-y-4">
        <h4 className="text-xs font-semibold text-foreground m-0">
          Add New Media Appearance
        </h4>

        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block">
                Show / Event Name
              </label>
              <input
                type="text"
                value={newShow}
                onChange={(e) => setNewShow(e.target.value)}
                placeholder="e.g. New Podcast"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block">
                Role Label
              </label>
              <input
                type="text"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                placeholder="e.g. Speaker / Guest"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block">
                Format Tag
              </label>
              <input
                type="text"
                value={newFormat}
                onChange={(e) => setNewFormat(e.target.value)}
                placeholder="e.g. Podcast Episode"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Description
            </label>
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Summary of the conversation..."
              className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Media / Episode URL (Optional)
            </label>
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://..."
              className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!newShow.trim() || !newDesc.trim()}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Appearance</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
