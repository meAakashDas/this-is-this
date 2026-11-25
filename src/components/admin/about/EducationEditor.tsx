import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { CmsEducationEntry } from '../../../types/cms/pages.ts';

interface EducationEditorProps {
  educationEntries: CmsEducationEntry[];
  onChange: (updated: CmsEducationEntry[]) => void;
}

export const EducationEditor: React.FC<EducationEditorProps> = ({
  educationEntries,
  onChange,
}) => {
  const [newTitle, setNewTitle] = useState('');
  const [newDegree, setNewDegree] = useState('');
  const [newInstitution, setNewInstitution] = useState('');
  const [newPeriod, setNewPeriod] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleUpdate = (index: number, field: keyof CmsEducationEntry, value: any) => {
    const updated = [...educationEntries];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = educationEntries
      .filter((_, i) => i !== index)
      .map((e, i) => ({
        ...e,
        order: i + 1,
        index: String(i + 1).padStart(2, '0'),
      }));
    onChange(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newEntry: CmsEducationEntry = {
      id: `edu-${Date.now()}`,
      index: String(educationEntries.length + 1).padStart(2, '0'),
      title: newTitle.trim(),
      order: educationEntries.length + 1,
      visible: true,
      ...(newDegree.trim() ? { degree: newDegree.trim() } : {}),
      ...(newInstitution.trim() ? { institution: newInstitution.trim() } : {}),
      ...(newPeriod.trim() ? { period: newPeriod.trim() } : {}),
      ...(newStatus.trim() ? { status: newStatus.trim() } : {}),
      ...(newDesc.trim() ? { desc: newDesc.trim() } : {}),
    };

    onChange([...educationEntries, newEntry]);
    setNewTitle('');
    setNewDegree('');
    setNewInstitution('');
    setNewPeriod('');
    setNewStatus('');
    setNewDesc('');
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {educationEntries.map((item, index) => (
          <div
            key={item.id || index}
            className="rounded-lg border border-border bg-background p-3.5 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-foreground truncate">
                {item.title || `Education #${index + 1}`}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(index)}
                aria-label={`Delete education item ${index + 1}`}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 text-[11px] font-medium cursor-pointer shrink-0"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Title
                </label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => handleUpdate(index, 'title', e.target.value)}
                  placeholder="Information Technology"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Degree (Optional)
                </label>
                <input
                  type="text"
                  value={item.degree || ''}
                  onChange={(e) => handleUpdate(index, 'degree', e.target.value)}
                  placeholder="BSc (Hons) Information Technology"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Institution (Optional)
                </label>
                <input
                  type="text"
                  value={item.institution || ''}
                  onChange={(e) => handleUpdate(index, 'institution', e.target.value)}
                  placeholder="Institution name"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Period (Optional)
                </label>
                <input
                  type="text"
                  value={item.period || ''}
                  onChange={(e) => handleUpdate(index, 'period', e.target.value)}
                  placeholder="2025–2028"
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Status (Optional)
                </label>
                <input
                  type="text"
                  value={item.status || ''}
                  onChange={(e) => handleUpdate(index, 'status', e.target.value)}
                  placeholder="Currently pursuing."
                  className="w-full text-xs rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] font-medium text-muted-foreground block">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={item.desc || ''}
                  onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                  placeholder="Additional details..."
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-card px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Education */}
      <form onSubmit={handleAdd} className="pt-3 border-t border-border/60 space-y-2.5">
        <span className="text-xs font-medium text-foreground block">Add Education</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Field / Qualification title"
            aria-label="New education title"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={newDegree}
            onChange={(e) => setNewDegree(e.target.value)}
            placeholder="Degree (optional)"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
          <input
            type="text"
            value={newInstitution}
            onChange={(e) => setNewInstitution(e.target.value)}
            placeholder="Institution (optional)"
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
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 sm:col-span-2"
          />
          <textarea
            rows={2}
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y sm:col-span-2"
          />
        </div>
        <button
          type="submit"
          disabled={!newTitle.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Education</span>
        </button>
      </form>
    </div>
  );
};
