import React, { useState, useEffect } from 'react';
import {
  Home,
  BookOpen,
  PenSquare,
  Layers,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
} from 'lucide-react';
import { HeroEditor, type HeroFormState } from './HeroEditor.tsx';
import { FeaturedResourcesEditor, type FeaturedResourcesState } from './FeaturedResourcesEditor.tsx';
import { FeaturedJournalEditor, type FeaturedJournalState } from './FeaturedJournalEditor.tsx';
import { HomepageSectionsEditor, type SectionMeta } from './HomepageSectionsEditor.tsx';
import { HomepagePreview } from './HomepagePreview.tsx';
import { getHomePageContent, saveHomePageContent } from '../../../lib/cms/pages.repository.ts';
import { sanitizeAssetUrl } from '../../../lib/cms/sanitize.ts';
import type { HomePageDocument } from '../../../types/cms/pages.ts';

type HomepageSubTab = 'hero' | 'resources' | 'journal' | 'sections' | 'preview';

interface HomepageEditorProps {
  isDevPreview?: boolean;
}

const DEFAULT_HOMEPAGE_STATE = {
  hero: {
    heroHeadline: "I'm Aakash Das.",
    heroRolePrefix: 'Founder of',
    heroRoleBrand: 'RisePaisa',
    heroRoleUrl: 'https://risepaisa.com',
    heroTagline: 'I love learning, building, and sharing.',
    heroPhotoUrl: '/images/aakash-das.webp',
    heroPhotoAlt: 'Aakash Das',
    primaryCta: {
      text: 'Explore free resources',
      url: '/resources',
      visible: true,
    },
    secondaryCta: {
      text: 'About me',
      url: '/about',
      visible: true,
    },
  },
  sections: [
    {
      id: 'hero',
      name: 'Hero Section',
      description: 'Profile portrait, main headline, role tagline, and action buttons.',
      visible: true,
    },
    {
      id: 'finder',
      name: 'Resource Lookup',
      description: 'Numerical input for direct educational resource lookup.',
      visible: true,
    },
    {
      id: 'featuredResources',
      name: 'Free Resources',
      description: 'Grid of selected featured educational resource cards.',
      visible: true,
    },
    {
      id: 'journal',
      name: 'Journal',
      description: 'Editorial article preview card linking to the journal.',
      visible: true,
    },
    {
      id: 'contact',
      name: 'Get in Touch',
      description: 'Email contact button and verified social media links.',
      visible: true,
    },
  ],
  resourcesConfig: {
    visible: true,
    heading: 'Free Resources',
    count: 3,
    customResourceIds: ['001', '002', '003'],
  },
  journalConfig: {
    visible: true,
    heading: 'Journal',
    description: 'Essays, research notes, and reflections on finance, technology, and building in Nepal.',
    ctaText: 'Read articles',
    ctaUrl: '/journal',
  },
};

const STORAGE_KEY = 'aakashdas_cms_homepage_preview';

export const HomepageEditor: React.FC<HomepageEditorProps> = ({ isDevPreview = false }) => {
  const [subTab, setSubTab] = useState<HomepageSubTab>('hero');
  const [formData, setFormData] = useState(DEFAULT_HOMEPAGE_STATE);
  const [initialData, setInitialData] = useState(DEFAULT_HOMEPAGE_STATE);
  const [loadedDoc, setLoadedDoc] = useState<HomePageDocument | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load initial content from Firestore or sessionStorage
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (isDevPreview && typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (isMounted) {
              setFormData(parsed);
              setInitialData(parsed);
              return;
            }
          } catch {
            // fallback
          }
        }
      }

      try {
        const homeDoc = await getHomePageContent();
        if (isMounted && homeDoc) {
          setLoadedDoc(homeDoc);
          const loaded = {
            hero: {
              heroHeadline: homeDoc.heroHeadline || DEFAULT_HOMEPAGE_STATE.hero.heroHeadline,
              heroRolePrefix: homeDoc.heroRolePrefix || DEFAULT_HOMEPAGE_STATE.hero.heroRolePrefix,
              heroRoleBrand: homeDoc.heroRoleBrand || DEFAULT_HOMEPAGE_STATE.hero.heroRoleBrand,
              heroRoleUrl: homeDoc.heroRoleUrl || DEFAULT_HOMEPAGE_STATE.hero.heroRoleUrl,
              heroTagline: homeDoc.heroTagline || DEFAULT_HOMEPAGE_STATE.hero.heroTagline,
              heroPhotoUrl: sanitizeAssetUrl(homeDoc.heroPhotoUrl, DEFAULT_HOMEPAGE_STATE.hero.heroPhotoUrl),
              heroPhotoAlt: homeDoc.heroPhotoAlt || DEFAULT_HOMEPAGE_STATE.hero.heroPhotoAlt,
              primaryCta: homeDoc.primaryCta || DEFAULT_HOMEPAGE_STATE.hero.primaryCta,
              secondaryCta: homeDoc.secondaryCta || DEFAULT_HOMEPAGE_STATE.hero.secondaryCta,
            },
            sections: DEFAULT_HOMEPAGE_STATE.sections.map((sec) => {
              if (sec.id === 'hero' && homeDoc.sections?.hero) {
                return { ...sec, visible: homeDoc.sections.hero.visible !== false };
              }
              if (sec.id === 'finder' && homeDoc.sections?.finder) {
                return { ...sec, visible: homeDoc.sections.finder.visible !== false };
              }
              if (sec.id === 'featuredResources' && homeDoc.sections?.featuredResources) {
                return { ...sec, visible: homeDoc.sections.featuredResources.visible !== false };
              }
              if (sec.id === 'journal' && homeDoc.sections?.journal) {
                return { ...sec, visible: homeDoc.sections.journal.visible !== false };
              }
              if (sec.id === 'contact' && homeDoc.sections?.contact) {
                return { ...sec, visible: homeDoc.sections.contact.visible !== false };
              }
              return sec;
            }),
            resourcesConfig: {
              visible: homeDoc.sections?.featuredResources?.visible ?? true,
              heading: homeDoc.sections?.featuredResources?.heading || 'Free Resources',
              count: homeDoc.sections?.featuredResources?.customResourceIds?.length || 3,
              customResourceIds: homeDoc.sections?.featuredResources?.customResourceIds || [
                '001',
                '002',
                '003',
              ],
            },
            journalConfig: {
              visible: homeDoc.sections?.journal?.visible ?? true,
              heading: homeDoc.sections?.journal?.heading || 'Journal',
              description:
                homeDoc.sections?.journal?.description ||
                DEFAULT_HOMEPAGE_STATE.journalConfig.description,
              ctaText: homeDoc.sections?.journal?.ctaText || 'Read articles',
              ctaUrl: homeDoc.sections?.journal?.ctaUrl || '/journal',
            },
          };
          setFormData(loaded);
          setInitialData(loaded);
        }
      } catch (err) {
        console.warn('[Homepage Editor] Loaded baseline state:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isDevPreview]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSave = async (publish: boolean = false) => {
    setIsSaving(true);
    setSaveStatus(null);

    // Development Preview mode
    if (isDevPreview) {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        }
        setInitialData(formData);
        setIsSaving(false);
        setSaveStatus({
          type: 'success',
          message: publish
            ? 'Homepage published to local preview state. (Live Firestore write disabled in Dev Preview)'
            : 'Homepage draft saved to local preview state.',
        });
      }, 300);
      return;
    }

    // Authenticated Production Mode
    try {
      const safeHeroPhotoUrl = sanitizeAssetUrl(
        formData.hero.heroPhotoUrl,
        DEFAULT_HOMEPAGE_STATE.hero.heroPhotoUrl
      );
      await saveHomePageContent({
        heroHeadline: formData.hero.heroHeadline,
        heroRolePrefix: formData.hero.heroRolePrefix,
        heroRoleBrand: formData.hero.heroRoleBrand,
        heroRoleUrl: formData.hero.heroRoleUrl,
        heroTagline: formData.hero.heroTagline,
        heroPhotoUrl: safeHeroPhotoUrl,
        heroPhotoAlt: formData.hero.heroPhotoAlt,
        primaryCta: formData.hero.primaryCta,
        secondaryCta: formData.hero.secondaryCta,
        sectionOrder: loadedDoc?.sectionOrder || ['finder', 'featuredResources', 'journal', 'contact'],
        seo: loadedDoc?.seo || {},
        sections: {
          hero: {
            ...(loadedDoc?.sections?.hero || {}),
            visible: formData.sections.find((s) => s.id === 'hero')?.visible ?? true,
          },
          finder: {
            heading: loadedDoc?.sections?.finder?.heading || 'Find Resources',
            placeholder: loadedDoc?.sections?.finder?.placeholder || 'Enter resource number',
            buttonLabel: loadedDoc?.sections?.finder?.buttonLabel || 'Find',
            visible: formData.sections.find((s) => s.id === 'finder')?.visible ?? true,
          },
          featuredResources: {
            visible: formData.sections.find((s) => s.id === 'featuredResources')?.visible ?? formData.resourcesConfig.visible,
            heading: formData.resourcesConfig.heading,
            count: formData.resourcesConfig.customResourceIds.length || 3,
            customResourceIds: formData.resourcesConfig.customResourceIds,
          },
          journal: {
            visible: formData.sections.find((s) => s.id === 'journal')?.visible ?? formData.journalConfig.visible,
            heading: formData.journalConfig.heading,
            description: formData.journalConfig.description,
            ctaText: formData.journalConfig.ctaText,
            ctaUrl: formData.journalConfig.ctaUrl,
          },
          contact: {
            heading: loadedDoc?.sections?.contact?.heading || 'Get in Touch',
            description: loadedDoc?.sections?.contact?.description || 'Feel free to reach out directly via email or connect on social platforms.',
            showEmail: loadedDoc?.sections?.contact?.showEmail ?? true,
            showSocial: loadedDoc?.sections?.contact?.showSocial ?? true,
            visible: formData.sections.find((s) => s.id === 'contact')?.visible ?? true,
          },
        },
      });

      setInitialData(formData);
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: publish
          ? 'Homepage successfully published to Cloud Firestore.'
          : 'Homepage draft saved to Cloud Firestore.',
      });
    } catch (err) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus({
        type: 'error',
        message: `Failed to save homepage: ${msg}`,
      });
    }
  };

  const handleReset = () => {
    if (confirm('Discard all unsaved changes to homepage content?')) {
      setFormData(initialData);
      setSaveStatus(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground m-0">
              Homepage CMS
            </h1>
            {isDirty && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 m-0">
            Manage homepage introduction, featured resources, journal preview, and section visibility.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Publish</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {saveStatus && (
        <div
          role="alert"
          className={`rounded-xl border p-3.5 text-xs flex items-center justify-between gap-3 ${
            saveStatus.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{saveStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveStatus(null)}
            className="text-[11px] underline cursor-pointer hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Simple Areas + Live Preview Sub-tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/60 scrollbar-none">
        <button
          type="button"
          onClick={() => setSubTab('hero')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'hero'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Hero Section</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('resources')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'resources'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Featured Resources</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border">
            {formData.resourcesConfig.customResourceIds.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('journal')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'journal'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <PenSquare className="w-3.5 h-3.5" />
          <span>Journal Section</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('sections')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'sections'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Section Visibility</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('preview')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'preview'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-primary" />
          <span>Live Preview</span>
        </button>
      </div>

      {/* Active Area Panel */}
      <div className="pt-2">
        {subTab === 'hero' && (
          <HeroEditor
            hero={formData.hero}
            isDevPreview={isDevPreview}
            onChange={(hero) => setFormData((prev) => ({ ...prev, hero }))}
          />
        )}

        {subTab === 'resources' && (
          <FeaturedResourcesEditor
            resourcesConfig={formData.resourcesConfig}
            isDevPreview={isDevPreview}
            onChange={(resourcesConfig) =>
              setFormData((prev) => ({ ...prev, resourcesConfig }))
            }
          />
        )}

        {subTab === 'journal' && (
          <FeaturedJournalEditor
            journalConfig={formData.journalConfig}
            onChange={(journalConfig) =>
              setFormData((prev) => ({ ...prev, journalConfig }))
            }
          />
        )}

        {subTab === 'sections' && (
          <HomepageSectionsEditor
            sections={formData.sections}
            onChange={(sections) => {
              // Update formData.sections, and keep resourcesConfig/journalConfig in sync
              setFormData((prev) => {
                const resVis = sections.find((s) => s.id === 'featuredResources')?.visible ?? prev.resourcesConfig.visible;
                const jourVis = sections.find((s) => s.id === 'journal')?.visible ?? prev.journalConfig.visible;
                return {
                  ...prev,
                  sections,
                  resourcesConfig: {
                    ...prev.resourcesConfig,
                    visible: resVis,
                  },
                  journalConfig: {
                    ...prev.journalConfig,
                    visible: jourVis,
                  },
                };
              });
            }}
          />
        )}

        {subTab === 'preview' && (
          <HomepagePreview
            hero={formData.hero}
            sections={formData.sections}
            resourcesConfig={formData.resourcesConfig}
            journalConfig={formData.journalConfig}
          />
        )}
      </div>
    </div>
  );
};
