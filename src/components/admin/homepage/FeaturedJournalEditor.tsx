import React from 'react';
import { Eye, EyeOff, ExternalLink } from 'lucide-react';

export interface FeaturedJournalState {
  visible: boolean;
  heading: string;
  description: string;
  ctaText: string;
  ctaUrl: string;
}

interface FeaturedJournalEditorProps {
  journalConfig: FeaturedJournalState;
  onChange: (updated: FeaturedJournalState) => void;
}

export const FeaturedJournalEditor: React.FC<FeaturedJournalEditorProps> = ({
  journalConfig,
  onChange,
}) => {
  const handleChange = (field: keyof FeaturedJournalState, value: any) => {
    onChange({
      ...journalConfig,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-foreground m-0">
            Preview Card Settings
          </h4>
          <button
            type="button"
            onClick={() => handleChange('visible', !journalConfig.visible)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            {journalConfig.visible ? (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span>Section Visible</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5" />
                <span>Section Hidden</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Section Heading
            </label>
            <input
              type="text"
              value={journalConfig.heading}
              onChange={(e) => handleChange('heading', e.target.value)}
              placeholder="Journal"
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Section Description
            </label>
            <textarea
              rows={2}
              value={journalConfig.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Essays, research notes, and reflections on finance, technology, and building in Nepal."
              className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block">
                Button Label
              </label>
              <input
                type="text"
                value={journalConfig.ctaText}
                onChange={(e) => handleChange('ctaText', e.target.value)}
                placeholder="Read articles"
                className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground block">
                Destination URL
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={journalConfig.ctaUrl}
                  onChange={(e) => handleChange('ctaUrl', e.target.value)}
                  placeholder="/journal"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                {journalConfig.ctaUrl && (
                  <a
                    href={journalConfig.ctaUrl}
                    target={journalConfig.ctaUrl.startsWith('http') ? '_blank' : undefined}
                    rel={journalConfig.ctaUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
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
    </div>
  );
};
