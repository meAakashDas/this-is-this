import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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

  const handleDelete = (index: number) => {
    const updated = mediaEntries
      .filter((_, i) => i !== index)
      .map((m, i) => ({ ...m, order: i + 1 }));
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
      order: mediaEntries.length + 1,
      visible: true,
      ...(newUrl.trim() ? { url: newUrl.trim() } : {}),
    };

    onChange([...mediaEntries, newEntry]);
    setNewShow('');
    setNewRole('Podcast Guest');
    setNewFormat('Featured Interview');
    setNewDesc('');
    setNewUrl('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {mediaEntries.map((item, index) => (
          <div
            key={item.id || index}
            className="rounded-lg border border-border bg-background p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground truncate">
                {item.show || `Media #${index + 1}`}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(index)}
                aria-label={`Delete media item ${index + 1}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 text-[11px] font-medium cursor-pointer shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Show / Event
                </label>
                <input
                  type="text"
                  value={item.show}
                  onChange={(e) => handleUpdate(index, 'show', e.target.value)}
                  placeholder="The Amit Show"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Role
                </label>
                <input
                  type="text"
                  value={item.role}
                  onChange={(e) => handleUpdate(index, 'role', e.target.value)}
                  placeholder="Podcast Guest"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Format
                </label>
                <input
                  type="text"
                  value={item.format}
                  onChange={(e) => handleUpdate(index, 'format', e.target.value)}
                  placeholder="Featured Interview"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={item.desc}
                  onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                  placeholder="Conversation summary..."
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  URL (Optional)
                </label>
                <input
                  type="text"
                  value={item.url || ''}
                  onChange={(e) => handleUpdate(index, 'url', e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs font-mono rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Media Item */}
      <form onSubmit={handleAdd} className="pt-3 border-t border-border/60 space-y-2.5">
        <span className="text-xs font-medium text-foreground block">Add Media Appearance</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            value={newShow}
            onChange={(e) => setNewShow(e.target.value)}
            placeholder="Show or event name"
            aria-label="New media show"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            placeholder="Role"
            aria-label="New media role"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={newFormat}
            onChange={(e) => setNewFormat(e.target.value)}
            placeholder="Format"
            aria-label="New media format"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <textarea
            rows={2}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Summary"
            aria-label="New media description"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y sm:col-span-3"
          />
          <input
            type="text"
            value={newUrl}
            onChange={(e) => setNewUrl(e.target.value)}
            placeholder="URL (optional)"
            className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 sm:col-span-3"
          />
        </div>
        <button
          type="submit"
          disabled={!newShow.trim() || !newDesc.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Appearance</span>
        </button>
      </form>
    </div>
  );
};
