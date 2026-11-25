import React, { useState } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
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

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...educationEntries];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    updated.forEach((e, i) => {
      e.order = i + 1;
      e.index = String(i + 1).padStart(2, '0');
    });
    onChange(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === educationEntries.length - 1) return;
    const updated = [...educationEntries];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    updated.forEach((e, i) => {
      e.order = i + 1;
      e.index = String(i + 1).padStart(2, '0');
    });
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = educationEntries.filter((_, i) => i !== index);
    updated.forEach((e, i) => {
      e.order = i + 1;
      e.index = String(i + 1).padStart(2, '0');
    });
    onChange(updated);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const nextIndex = String(educationEntries.length + 1).padStart(2, '0');
    const newEntry: CmsEducationEntry = {
      id: `edu-${Date.now()}`,
      index: nextIndex,
      title: newTitle.trim(),
      order: educationEntries.length + 1,
      visible: true,
    };
    if (newDegree.trim()) newEntry.degree = newDegree.trim();
    if (newInstitution.trim()) newEntry.institution = newInstitution.trim();
    if (newPeriod.trim()) newEntry.period = newPeriod.trim();
    if (newStatus.trim()) newEntry.status = newStatus.trim();
    if (newDesc.trim()) newEntry.desc = newDesc.trim();

    onChange([...educationEntries, newEntry]);
    setNewTitle('');
    setNewDegree('');
    setNewInstitution('');
    setNewPeriod('');
    setNewStatus('');
    setNewDesc('');
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          Education
        </h3>
        <p className="text-xs text-muted-foreground m-0">
          Manage academic qualifications and education records.
        </p>
      </div>

      {/* Education Entries List */}
      <div className="space-y-4">
        {educationEntries.map((item, index) => (
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
                  {item.title || `Education Record ${index + 1}`}
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
                  disabled={index === educationEntries.length - 1}
                  title="Move down"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  title="Delete record"
                  className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Field / Qualification Title
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => handleUpdate(index, 'title', e.target.value)}
                    placeholder="e.g. Information Technology"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Degree / Award (Optional)
                  </label>
                  <input
                    type="text"
                    value={item.degree || ''}
                    onChange={(e) => handleUpdate(index, 'degree', e.target.value)}
                    placeholder="e.g. BSc (Hons) Information Technology"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Institution (Optional)
                  </label>
                  <input
                    type="text"
                    value={item.institution || ''}
                    onChange={(e) => handleUpdate(index, 'institution', e.target.value)}
                    placeholder="e.g. Coventry University | Softwarica"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-1">
                  <label className="text-xs font-medium text-foreground block">
                    Period / Timeline
                  </label>
                  <input
                    type="text"
                    value={item.period || ''}
                    onChange={(e) => handleUpdate(index, 'period', e.target.value)}
                    placeholder="e.g. 2025–2028"
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Description / Context (Optional)
                </label>
                <textarea
                  rows={2}
                  value={item.desc || ''}
                  onChange={(e) => handleUpdate(index, 'desc', e.target.value)}
                  placeholder="Context or additional study details..."
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
                  placeholder="e.g. Currently pursuing."
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add New Record Form */}
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-5 space-y-4">
        <h4 className="text-xs font-semibold text-foreground m-0">
          Add New Education Record
        </h4>

        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-foreground block">
                Field / Qualification Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Data Science"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-foreground block">
                Degree / Award (Optional)
              </label>
              <input
                type="text"
                value={newDegree}
                onChange={(e) => setNewDegree(e.target.value)}
                placeholder="e.g. Diploma"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-foreground block">
                Institution (Optional)
              </label>
              <input
                type="text"
                value={newInstitution}
                onChange={(e) => setNewInstitution(e.target.value)}
                placeholder="e.g. University Name"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-foreground block">
                Period / Timeline
              </label>
              <input
                type="text"
                value={newPeriod}
                onChange={(e) => setNewPeriod(e.target.value)}
                placeholder="e.g. 2026–Present"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Description / Context (Optional)
            </label>
            <textarea
              rows={2}
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Context or coursework focus..."
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
              placeholder="e.g. Currently pursuing."
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!newTitle.trim()}
              className="inline-flex items-center gap-1.5 h-8 px-3.5 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
