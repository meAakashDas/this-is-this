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
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground m-0">Section Visibility</h3>

      <div className="space-y-2">
        {activeSections.map((sec, index) => (
          <div
            key={sec.id}
            className={`flex items-center justify-between gap-4 p-3 rounded-lg border ${
              sec.visible
                ? 'border-border bg-background'
                : 'border-border/50 bg-secondary/20 opacity-70'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-xs font-mono text-muted-foreground shrink-0">
                0{index + 1}
              </span>
              <span className="text-xs font-medium text-foreground truncate">
                {sec.name}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleToggle(sec.id)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-border bg-card hover:bg-secondary text-foreground cursor-pointer shrink-0"
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
  );
};
