import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...experienceEntries];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updated.forEach((e, i) => {
      e.order = i + 1;
    });
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === experienceEntries.length - 1) return;
    const updated = [...experienceEntries];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updated.forEach((e, i) => {
      e.order = i + 1;
    });
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = experienceEntries.filter((_, i) => i !== index);
    updated.forEach((e, i) => {
      e.order = i + 1;
    });
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
    };
    if (newPeriod.trim()) newEntry.period = newPeriod.trim();
    if (newDesc.trim()) newEntry.desc = newDesc.trim();
    if (newStatus.trim()) newEntry.status = newStatus.trim();

    onChange([...experienceEntries, newEntry]);
    setNewOrg('');
    setNewPosition('');
    setNewPeriod('');
    setNewDesc('');
    setNewStatus('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          Professional Experience
        </h3>
        <p className="text-xs text-muted-foreground m-0">
          Manage career history and professional roles.
        </p>
      </div>

      {/* Experience Entries List */}
      <div className="space-y-4">
        {experienceEntries.map((item, index) => (
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
                  {item.position} — {item.organization}
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
                  disabled={index === experienceEntries.length - 1}
                  title="Move down"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(index)}
                  title="Delete role"
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
                    Position / Title
                  </label>
                  <input
                    type="text"
                    value={item.position}
                    onChange={(e) => handleUpdate(index, 'position', e.target.value)}
                    placeholder="e.g. Founder & Lead Educator"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={item.organization}
                    onChange={(e) => handleUpdate(index, 'organization', e.target.value)}
                    placeholder="e.g. RisePaisa"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Period
                  </label>
                  <input
                    type="text"
                    value={item.period || ''}
                    onChange={(e) => handleUpdate(index, 'period', e.target.value)}
                    placeholder="e.g. 2024–Present"
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
                  value={item.desc || ''}
                  onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                  placeholder="Key responsibilities and initiatives..."
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Status Tag (Optional)
                </label>
                <input
                  type="text"
                  value={item.status || ''}
                  onChange={(e) => handleUpdate(index, 'status', e.target.value)}
                  placeholder="e.g. Current"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Role Form */}
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-5 space-y-4">
        <h4 className="text-xs font-semibold text-foreground m-0">
          Add New Professional Role
        </h4>

        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-foreground block">
                Position / Title
              </label>
              <input
                type="text"
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder="e.g. Lead Consultant"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-foreground block">
                Organization
              </label>
              <input
                type="text"
                value={newOrg}
                onChange={(e) => setNewOrg(e.target.value)}
                placeholder="e.g. Organization Name"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-foreground block">
                Period
              </label>
              <input
                type="text"
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                placeholder="e.g. 2025–Present"
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
              placeholder="Role description..."
              className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Status Tag (Optional)
            </label>
            <input
              type="text"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              placeholder="e.g. Current"
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!newOrg.trim() || !newPosition.trim()}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Role</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
