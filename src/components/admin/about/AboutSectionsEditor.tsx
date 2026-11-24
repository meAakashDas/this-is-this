import React from 'react';
import {
  Layers,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  User,
  Briefcase,
  Mic,
  GraduationCap,
  Building2,
  Mail,
} from 'lucide-react';
import type { AboutPageDocument } from '../../../types/cms/pages.ts';

interface AboutSectionsEditorProps {
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
  contact: AboutPageDocument['contact'];
  onChangeOrder: (newOrder: string[]) => void;
  onChangeVisibility: (newVisibility: Record<string, boolean>) => void;
  onChangeContact: (newContact: AboutPageDocument['contact']) => void;
}

interface SectionMeta {
  id: string;
  name: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTION_METAS: Record<string, SectionMeta> = {
  intro: {
    id: 'intro',
    name: 'Introduction & Biography',
    desc: 'Page title and personal narrative paragraphs introducing background and focus.',
    icon: User,
  },
  work: {
    id: 'work',
    name: 'My Work & Initiatives',
    desc: 'Cards showcasing core ventures: RisePaisa, riseNEPSE, and digital resources.',
    icon: Briefcase,
  },
  media: {
    id: 'media',
    name: 'Conversations & Media',
    desc: 'Feature card for podcast appearances, guest interviews, and media coverage.',
    icon: Mic,
  },
  education: {
    id: 'education',
    name: 'Education',
    desc: 'Academic timeline, degrees, institutions, and study programs.',
    icon: GraduationCap,
  },
  experience: {
    id: 'experience',
    name: 'Professional Experience',
    desc: 'Founding and professional roles, advisory positions, and organizational engagements.',
    icon: Building2,
  },
  contact: {
    id: 'contact',
    name: 'Get in Touch',
    desc: 'Direct email action button and social platform pills.',
    icon: Mail,
  },
};

const DEFAULT_ORDER = ['intro', 'work', 'media', 'education', 'experience', 'contact'];

export const AboutSectionsEditor: React.FC<AboutSectionsEditorProps> = ({
  sectionOrder,
  sectionVisibility,
  contact,
  onChangeOrder,
  onChangeVisibility,
  onChangeContact,
}) => {
  const currentOrder = sectionOrder.length > 0 ? sectionOrder : DEFAULT_ORDER;

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const updated = [...currentOrder];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChangeOrder(updated);
  };

  const handleMoveDown = (index: number) => {
    if (index === currentOrder.length - 1) return;
    const updated = [...currentOrder];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChangeOrder(updated);
  };

  const handleToggleVisible = (id: string) => {
    const isVisible = sectionVisibility[id] !== false;
    onChangeVisibility({
      ...sectionVisibility,
      [id]: !isVisible,
    });
    if (id === 'contact') {
      onChangeContact({
        ...contact,
        visible: !isVisible,
      });
    }
  };

  const handleReset = () => {
    onChangeOrder(DEFAULT_ORDER);
    const resetVis: Record<string, boolean> = {};
    DEFAULT_ORDER.forEach((id) => {
      resetVis[id] = true;
    });
    onChangeVisibility(resetVis);
    onChangeContact({
      ...contact,
      visible: true,
      showEmail: true,
      showSocial: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            About Page Section Sequence & Visibility
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control the vertical order and visibility of every content section on the About page.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
          title="Reset to default sequence"
        >
          <RotateCcw className="w-3.5 h-3.5 text-muted-foreground" />
          Reset Defaults
        </button>
      </div>

      {/* Sections List */}
      <div className="space-y-3">
        {currentOrder.map((sectionId, index) => {
          const meta = SECTION_METAS[sectionId] || {
            id: sectionId,
            name: sectionId,
            desc: '',
            icon: Layers,
          };
          const IconComponent = meta.icon;
          const isVisible = sectionVisibility[sectionId] !== false;

          return (
            <div
              key={sectionId}
              className={`p-4 rounded-xl border transition-all ${
                isVisible
                  ? 'border-border bg-card shadow-xs'
                  : 'border-border/60 bg-muted/30 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-secondary border border-border flex items-center justify-center text-xs font-mono font-semibold text-muted-foreground shrink-0">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">
                        {meta.name}
                      </span>
                      {!isVisible && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-destructive/10 text-destructive border border-destructive/20">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate max-w-md">
                      {meta.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleVisible(sectionId)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                    title={isVisible ? 'Hide Section' : 'Show Section'}
                    aria-label={isVisible ? `Hide ${meta.name}` : `Show ${meta.name}`}
                  >
                    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-destructive" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                    title="Move Section Up"
                    aria-label={`Move ${meta.name} up`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === currentOrder.length - 1}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                    title="Move Section Down"
                    aria-label={`Move ${meta.name} down`}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sub-controls for Contact */}
              {sectionId === 'contact' && isVisible && (
                <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-6 pl-12 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={contact.showEmail}
                      onChange={(e) =>
                        onChangeContact({ ...contact, showEmail: e.target.checked })
                      }
                      className="rounded-sm border-input text-primary focus:ring-primary/20"
                    />
                    <span>Show Direct Email Action</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={contact.showSocial}
                      onChange={(e) =>
                        onChangeContact({ ...contact, showSocial: e.target.checked })
                      }
                      className="rounded-sm border-input text-primary focus:ring-primary/20"
                    />
                    <span>Show Social Media Pills</span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
