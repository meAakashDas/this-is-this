import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CmsExperienceEntry } from '../../../types/cms/pages.ts';

interface ExperienceEditorProps {
  experienceEntries: CmsExperienceEntry[];
  onChange: (updated: CmsExperienceEntry[]) => void;
}

export const ExperienceEditor: React.FC<ExperienceEditorProps> = ({
  experienceEntries,
  onChange,
}) => {
  const [newOrg, setNewOrg] = useState('');
  const [newPosition, setNewPosition] = useState('');
  const [newPeriod, setNewPeriod] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const handleUpdate = (index: number, field: keyof CmsExperienceEntry, value: any) => {
    const updated = [...experienceEntries];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = experienceEntries
      .filter((_, i) => i !== index)
      .map((e, i) => ({ ...e, order: i + 1 }));
    onChange(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrg.trim() || !newPosition.trim()) return;

    const newEntry: CmsExperienceEntry = {
      id: `exp-${Date.now()}`,
      organization: newOrg.trim(),
      position: newPosition.trim(),
      order: experienceEntries.length + 1,
      visible: true,
      ...(newPeriod.trim() ? { period: newPeriod.trim() } : {}),
      ...(newDesc.trim() ? { desc: newDesc.trim() } : {}),
      ...(newStatus.trim() ? { status: newStatus.trim() } : {}),
    };

    onChange([...experienceEntries, newEntry]);
    setNewOrg('');
    setNewPosition('');
    setNewPeriod('');
    setNewDesc('');
    setNewStatus('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {experienceEntries.map((item, index) => (
          <div
            key={item.id || index}
            className="rounded-lg border border-border bg-background p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground truncate">
                {item.position} — {item.organization}
              </span>
              <button
                type="button"
                onClick={() => handleDelete(index)}
                aria-label={`Delete experience item ${index + 1}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 text-[11px] font-medium cursor-pointer shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Position
                </label>
                <input
                  type="text"
                  value={item.position}
                  onChange={(e) => handleUpdate(index, 'position', e.target.value)}
                  placeholder="Founder & Lead Educator"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Organization
                </label>
                <input
                  type="text"
                  value={item.organization}
                  onChange={(e) => handleUpdate(index, 'organization', e.target.value)}
                  placeholder="RisePaisa"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Period
                </label>
                <input
                  type="text"
                  value={item.period || ''}
                  onChange={(e) => handleUpdate(index, 'period', e.target.value)}
                  placeholder="2024–Present"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Status (Optional)
                </label>
                <input
                  type="text"
                  value={item.status || ''}
                  onChange={(e) => handleUpdate(index, 'status', e.target.value)}
                  placeholder="Current"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-3">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={item.desc || ''}
                  onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                  placeholder="Role summary..."
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Role */}
      <form onSubmit={handleAdd} className="pt-3 border-t border-border/60 space-y-2.5">
        <span className="text-xs font-medium text-foreground block">Add Experience</span>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <input
            type="text"
            value={newPosition}
            onChange={(e) => setNewPosition(e.target.value)}
            placeholder="Position"
            aria-label="New experience position"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={newOrg}
            onChange={(e) => setNewOrg(e.target.value)}
            placeholder="Organization"
            aria-label="New experience organization"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={newPeriod}
            onChange={(e) => setNewPeriod(e.target.value)}
            placeholder="Period (optional)"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            placeholder="Status (optional)"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 sm:col-span-3"
          />
          <textarea
            rows={2}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y sm:col-span-3"
          />
        </div>
        <button
          type="submit"
          disabled={!newOrg.trim() || !newPosition.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Experience</span>
        </button>
      </form>
    </div>
  );
};
