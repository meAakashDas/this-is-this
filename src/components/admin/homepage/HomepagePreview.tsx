import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  ArrowRight,
  Mail,
} from 'lucide-react';
import type { HeroFormState } from './HeroEditor.tsx';
import type { FeaturedResourcesState } from './FeaturedResourcesEditor.tsx';
import type { FeaturedJournalState } from './FeaturedJournalEditor.tsx';
import type { SectionMeta } from './HomepageSectionsEditor.tsx';
import { resourcesData } from '../../../data/resources.ts';

interface HomepagePreviewProps {
  hero: HeroFormState;
  sections: SectionMeta[];
  resourcesConfig: FeaturedResourcesState;
  journalConfig: FeaturedJournalState;
}

export const HomepagePreview: React.FC<HomepagePreviewProps> = ({
  hero,
  sections,
  resourcesConfig,
  journalConfig,
}) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Map section visibility
  const isSectionVisible = (id: string) => {
    const sec = sections.find((s) => s.id === id);
    return sec ? sec.visible !== false : true;
  };

  const currentResourceIds = resourcesConfig.customResourceIds || [];

  return (
    <div className="space-y-4">
      {/* Viewport Toolbar */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div>
          <h3 className="text-base font-semibold text-foreground m-0">
            Live Preview
          </h3>
          <p className="text-xs text-muted-foreground m-0">
            Preview homepage appearance on desktop and mobile viewports.
          </p>
        </div>

        {/* Viewport switch */}
        <div className="inline-flex items-center gap-1 p-1 rounded-xl border border-border bg-card shadow-2xs">
          <button
            type="button"
            onClick={() => setDevice('desktop')}
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              device === 'desktop'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Desktop</span>
          </button>

          <button
            type="button"
            onClick={() => setDevice('mobile')}
            className={`inline-flex items-center gap-1.5 h-7 px-2.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              device === 'mobile'
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mobile (390px)</span>
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div className="flex justify-center bg-secondary/30 border border-border rounded-2xl p-4 sm:p-8 overflow-x-auto">
        <div
          className={`bg-background text-foreground transition-all duration-300 rounded-xl border border-border shadow-sm p-4 sm:p-6 space-y-8 ${
            device === 'mobile' ? 'w-[390px] min-w-[390px]' : 'w-full max-w-4xl'
          }`}
        >
          {/* SECTION: Hero */}
          {isSectionVisible('hero') && (
            <div className="pt-2 text-center space-y-4">
              <div className="flex justify-center">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 border border-border bg-card shadow-xs overflow-hidden">
                  <img
                    src={hero.heroPhotoUrl || '/images/aakash-das.webp'}
                    alt={hero.heroPhotoAlt || 'Aakash Das'}
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/aakash-das.webp';
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2 max-w-lg mx-auto">
                <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-foreground m-0">
                  {hero.heroHeadline || "I'm Aakash Das."}
                </h1>

                <p className="text-sm sm:text-base text-muted-foreground m-0">
                  <span className="font-light">{hero.heroRolePrefix || 'Founder of'}</span>{' '}
                  <span className="font-medium text-foreground underline underline-offset-4 decoration-border">
                    {hero.heroRoleBrand || 'RisePaisa'}
                  </span>
                  .
                </p>

                <p className="text-xs sm:text-sm text-muted-foreground m-0">
                  {hero.heroTagline || 'I love learning, building, and sharing.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {hero.primaryCta.visible && (
                  <span className="inline-flex items-center gap-2 h-10 px-4 text-xs font-medium rounded-md bg-primary text-primary-foreground shadow-xs">
                    <span>{hero.primaryCta.text || 'Explore free resources'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}

                {hero.secondaryCta.visible && (
                  <span className="inline-flex items-center gap-2 h-10 px-4 text-xs font-medium rounded-md border border-input bg-background text-foreground shadow-xs">
                    <span>{hero.secondaryCta.text || 'About me'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* SECTION: Finder */}
          {isSectionVisible('finder') && (
            <div className="rounded-xl border border-border bg-card p-4 max-w-md mx-auto space-y-2">
              <h2 className="text-base font-semibold text-foreground m-0">
                Find Resources
              </h2>
              <div className="flex gap-2">
                <input
                  type="text"
                  disabled
                  placeholder="Enter resource number"
                  className="flex-1 text-xs rounded-lg border border-input bg-background px-3 py-1.5 text-muted-foreground font-mono"
                />
                <button
                  type="button"
                  disabled
                  className="h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground opacity-90"
                >
                  Find
                </button>
              </div>
            </div>
          )}

          {/* SECTION: Featured Resources */}
          {isSectionVisible('featuredResources') && resourcesConfig.visible && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
                  {resourcesConfig.heading || 'Free Resources'}
                </h2>
                <span className="text-xs text-muted-foreground">View all →</span>
              </div>

              <div
                className={`grid gap-4 ${
                  device === 'mobile' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'
                }`}
              >
                {currentResourceIds.map((resId) => {
                  const matched = resourcesData.find((r) => r.resourceNumber === resId);
                  const title = matched?.title || `Resource #${resId}`;
                  const desc = matched?.description || 'Educational resource and guide.';

                  return (
                    <div
                      key={resId}
                      className="rounded-xl border border-border bg-card p-4 space-y-2.5 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                          NO. {resId}
                        </span>
                        <h3 className="text-sm font-semibold text-foreground leading-snug m-0">
                          {title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 m-0">
                          {desc}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex justify-end">
                        <span className="text-xs font-medium text-foreground inline-flex items-center gap-1">
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SECTION: Journal */}
          {isSectionVisible('journal') && journalConfig.visible && (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-foreground m-0">
                  {journalConfig.heading || 'Journal'}
                </h2>
                <p className="text-xs text-muted-foreground m-0">
                  {journalConfig.description ||
                    'Essays, research notes, and reflections on finance, technology, and building in Nepal.'}
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-medium rounded-md border border-input bg-background px-3 py-1.5 text-foreground shrink-0">
                <span>{journalConfig.ctaText || 'Read articles'}</span>
                <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          )}

          {/* SECTION: Contact */}
          {isSectionVisible('contact') && (
            <div className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-foreground m-0">
                    Get in Touch
                  </h2>
                  <p className="text-xs text-muted-foreground m-0">
                    Feel free to reach out directly via email or connect on social platforms.
                  </p>
                </div>

                <span className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-mono font-medium rounded-md bg-primary text-primary-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>contact@aakashdas.live</span>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
