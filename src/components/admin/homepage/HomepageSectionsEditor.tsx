import React from 'react';
import { Eye, EyeOff } from 'lucide-react';

export interface SectionMeta {
  id: string;
  name: string;
  description: string;
  visible: boolean;
}

export const FIXED_HOMEPAGE_SECTIONS: Omit<SectionMeta, 'visible'>[] = [
  {
    id: 'hero',
    name: 'Hero Section',
    description: 'Profile portrait, main headline, role tagline, and action buttons.',
  },
  {
    id: 'finder',
    name: 'Resource Lookup',
    description: 'Numerical input for direct educational resource lookup.',
  },
  {
    id: 'featuredResources',
    name: 'Free Resources',
    description: 'Grid of selected featured educational resource cards.',
  },
  {
    id: 'journal',
    name: 'Journal',
    description: 'Editorial article preview card linking to the journal.',
  },
  {
    id: 'contact',
    name: 'Get in Touch',
    description: 'Email contact button and verified social media links.',
  },
];

interface HomepageSectionsEditorProps {
  sections: SectionMeta[];
  onChange: (updated: SectionMeta[]) => void;
}

export const HomepageSectionsEditor: React.FC<HomepageSectionsEditorProps> = ({
  sections,
  onChange,
}) => {
  // Ensure we always represent the 5 fixed sections in order
  const activeSections = FIXED_HOMEPAGE_SECTIONS.map((fixed) => {
    const found = sections.find((s) => s.id === fixed.id);
    return {
      ...fixed,
      visible: found ? found.visible !== false : true,
    };
  });

  const handleToggle = (id: string) => {
    const updated = activeSections.map((sec) =>
      sec.id === id ? { ...sec, visible: !sec.visible } : sec
    );
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground m-0">
          Section Visibility
        </h3>
        <p className="text-xs text-muted-foreground m-0">
          Show or hide sections on the homepage. Sections appear in a fixed editorial order.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-2xs">
        <div className="space-y-2">
          {activeSections.map((sec, index) => (
            <div
              key={sec.id}
              className={`flex items-center justify-between gap-4 p-3.5 rounded-lg border transition-all ${
                sec.visible
                  ? 'border-border bg-card hover:bg-secondary/30'
                  : 'border-border/50 bg-secondary/10 opacity-70'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 h-6 rounded-md border border-border bg-secondary flex items-center justify-center text-[11px] font-mono text-muted-foreground shrink-0">
                  0{index + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">
                    {sec.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {sec.description}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleToggle(sec.id)}
                className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer shrink-0 ${
                  sec.visible
                    ? 'border border-border bg-card text-foreground hover:bg-secondary'
                    : 'border border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground'
                }`}
                aria-label={`Toggle visibility of ${sec.name}`}
              >
                {sec.visible ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Hidden</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
