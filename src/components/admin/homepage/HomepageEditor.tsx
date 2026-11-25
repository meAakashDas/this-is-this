import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react';
import { HeroEditor } from './HeroEditor.tsx';
import { FeaturedResourcesEditor } from './FeaturedResourcesEditor.tsx';
import { FeaturedJournalEditor } from './FeaturedJournalEditor.tsx';
import { HomepageSectionsEditor, type SectionMeta } from './HomepageSectionsEditor.tsx';
import { getHomePageContent, saveHomePageContent } from '../../../lib/cms/pages.repository.ts';
import { sanitizeAssetUrl } from '../../../lib/cms/sanitize.ts';
import type { HomePageDocument } from '../../../types/cms/pages.ts';

type HomepageSubTab = 'hero' | 'resources' | 'journal' | 'sections';

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
      description: 'Introduction, portrait, and action buttons.',
      visible: true,
    },
    {
      id: 'finder',
      name: 'Resource Lookup',
      description: 'Direct resource number lookup input.',
      visible: true,
    },
    {
      id: 'featuredResources',
      name: 'Free Resources',
      description: 'Selected featured educational resources.',
      visible: true,
    },
    {
      id: 'journal',
      name: 'Journal',
      description: 'Journal section link and intro.',
      visible: true,
    },
    {
      id: 'contact',
      name: 'Get in Touch',
      description: 'Contact email and social links.',
      visible: true,
    },
  ] as SectionMeta[],
  resourcesConfig: {
    visible: true,
    heading: 'Free Resources',
    count: 3,
    customResourceIds: ['001', '002', '003'],
  },
  journalConfig: {
    visible: true,
    heading: 'Journal',
    description:
      'Essays, research notes, and reflections on finance, technology, and building in Nepal.',
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
            // Fall back
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
              heroPhotoUrl: sanitizeAssetUrl(
                homeDoc.heroPhotoUrl,
                DEFAULT_HOMEPAGE_STATE.hero.heroPhotoUrl
              ),
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
        console.warn('[HomepageEditor] Using baseline homepage state:', err);
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

    if (isDevPreview) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
      }
      setInitialData(formData);
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: publish
          ? 'Homepage published to local preview state.'
          : 'Homepage draft saved to local preview state.',
      });
      return;
    }

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
        sectionOrder: loadedDoc?.sectionOrder || [
          'finder',
          'featuredResources',
          'journal',
          'contact',
        ],
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
            visible:
              formData.sections.find((s) => s.id === 'featuredResources')?.visible ??
              formData.resourcesConfig.visible,
            heading: formData.resourcesConfig.heading,
            count: formData.resourcesConfig.customResourceIds.length || 3,
            customResourceIds: formData.resourcesConfig.customResourceIds,
          },
          journal: {
            visible:
              formData.sections.find((s) => s.id === 'journal')?.visible ??
              formData.journalConfig.visible,
            heading: formData.journalConfig.heading,
            description: formData.journalConfig.description,
            ctaText: formData.journalConfig.ctaText,
            ctaUrl: formData.journalConfig.ctaUrl,
          },
          contact: {
            heading: loadedDoc?.sections?.contact?.heading || 'Get in Touch',
            description:
              loadedDoc?.sections?.contact?.description ||
              'Feel free to reach out directly via email or connect on social platforms.',
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
          ? 'Homepage published to Cloud Firestore.'
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
    setFormData(initialData);
    setSaveStatus(null);
  };

  const tabs: Array<{ id: HomepageSubTab; label: string }> = [
    { id: 'hero', label: 'Hero' },
    { id: 'resources', label: 'Featured Resources' },
    { id: 'journal', label: 'Journal' },
    { id: 'sections', label: 'Sections' },
  ];

  return (
    <div className="space-y-5 max-w-3xl pb-10">
      {/* Header & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground m-0">
            Homepage
          </h1>
          {isDirty && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
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

      {saveStatus && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
            saveStatus.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{saveStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveStatus(null)}
            className="text-[11px] underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Simple Section Filter Tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer ${
              subTab === tab.id
                ? 'bg-primary text-primary-foreground'
                : 'border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Section Panel */}
      <div>
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
              setFormData((prev) => {
                const resVis =
                  sections.find((s) => s.id === 'featuredResources')?.visible ??
                  prev.resourcesConfig.visible;
                const jourVis =
                  sections.find((s) => s.id === 'journal')?.visible ??
                  prev.journalConfig.visible;
                return {
                  ...prev,
                  sections,
                  resourcesConfig: { ...prev.resourcesConfig, visible: resVis },
                  journalConfig: { ...prev.journalConfig, visible: jourVis },
                };
              });
            }}
          />
        )}
      </div>
    </div>
  );
};
