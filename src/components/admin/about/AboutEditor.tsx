import React, { useState, useEffect } from 'react';
import {
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Plus,
  Trash2,
} from 'lucide-react';
import { WorkEditor } from './WorkEditor.tsx';
import { EducationEditor } from './EducationEditor.tsx';
import { MediaMentionsEditor } from './MediaMentionsEditor.tsx';
import { ExperienceEditor } from './ExperienceEditor.tsx';
import { getAboutPageContent, saveAboutPageContent } from '../../../lib/cms/pages.repository.ts';
import type {
  AboutPageDocument,
  CmsWorkEntry,
  CmsMediaEntry,
  CmsEducationEntry,
  CmsExperienceEntry,
} from '../../../types/cms/pages.ts';

interface AboutEditorProps {
  isDevPreview?: boolean;
}

const DEFAULT_ABOUT_STATE: AboutPageDocument = {
  id: 'about',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  title: 'About Aakash Das',
  introParagraphs: [
    "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education, making complex financial topics easier to understand through practical content and digital learning resources.",
    "My work focuses on Nepal's financial system, including personal finance, banking, taxation, fintech, financial literacy, and the stock market. Through RisePaisa, I aim to make reliable financial knowledge more accessible and help students, young professionals, and everyday learners make better-informed financial decisions.",
    "Alongside my work in finance education, I'm studying Information Technology and exploring how technology can improve the way people learn, access information, and manage their finances.",
  ],
  workEntries: [
    {
      id: 'work-1',
      index: '01',
      name: 'RisePaisa',
      desc: 'Building a Nepal-focused financial education platform that makes personal finance, banking, taxation, fintech, and investment concepts easier to understand through educational content, practical resources, and digital learning tools.',
      link: { text: 'Visit RisePaisa', url: 'https://risepaisa.com', isExternal: true },
      order: 1,
      visible: true,
    },
    {
      id: 'work-2',
      index: '02',
      name: 'riseNEPSE',
      desc: "Creating educational content focused on Nepal's stock market, NEPSE, fundamental and technical analysis, and investment knowledge to make stock market education more accessible.",
      order: 2,
      visible: true,
    },
    {
      id: 'work-3',
      index: '03',
      name: 'Finance Education & Content',
      desc: "Creating educational videos, research-based explanations, and practical digital resources covering Nepal's financial system, personal finance, and technology.",
      link: { text: 'Explore Resources', url: '/resources', isExternal: false },
      order: 3,
      visible: true,
    },
  ],
  mediaEntries: [
    {
      id: 'media-1',
      show: 'The Amit Show',
      role: 'Podcast Guest',
      format: 'Featured Interview',
      desc: 'A conversation about building RisePaisa, content creation, audience growth, and my journey as a young entrepreneur and finance educator.',
      order: 1,
      visible: true,
    },
  ],
  educationEntries: [
    {
      id: 'edu-1',
      index: '01',
      title: 'Information Technology',
      degree: 'BSc (Hons) Information Technology',
      institution: 'Coventry University | Via Softwarica College of IT & E-Commerce',
      period: '2025–2028',
      status: 'Currently pursuing.',
      order: 1,
      visible: true,
    },
    {
      id: 'edu-2',
      index: '02',
      title: 'Chartered Accountancy',
      desc: 'Previously pursued Chartered Accountancy studies through ICAI, 2024–2025. Later transitioned towards Information Technology.',
      order: 2,
      visible: true,
    },
  ],
  experienceEntries: [
    {
      id: 'exp-1',
      position: 'Founder & Lead Educator',
      organization: 'RisePaisa',
      period: '2024–Present',
      desc: 'Directing content strategy, financial curriculum design, and digital educational tools.',
      status: 'Current',
      order: 1,
      visible: true,
    },
  ],
  contact: { visible: true, showEmail: true, showSocial: true },
  sectionOrder: ['about-intro', 'work', 'media', 'education', 'experience', 'contact'],
  sectionVisibility: {
    'about-intro': true,
    work: true,
    media: true,
    education: true,
    experience: true,
    contact: true,
  },
  seo: {
    title: 'About Aakash Das — Personal Website',
    description:
      "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education.",
  },
};

const DEV_STORAGE_KEY = 'aakashdas_cms_about_preview';

export const AboutEditor: React.FC<AboutEditorProps> = ({ isDevPreview = false }) => {
  const [title, setTitle] = useState(DEFAULT_ABOUT_STATE.title);
  const [introParagraphs, setIntroParagraphs] = useState<string[]>(
    DEFAULT_ABOUT_STATE.introParagraphs
  );
  const [workEntries, setWorkEntries] = useState<CmsWorkEntry[]>(DEFAULT_ABOUT_STATE.workEntries);
  const [mediaEntries, setMediaEntries] = useState<CmsMediaEntry[]>(
    DEFAULT_ABOUT_STATE.mediaEntries
  );
  const [educationEntries, setEducationEntries] = useState<CmsEducationEntry[]>(
    DEFAULT_ABOUT_STATE.educationEntries
  );
  const [experienceEntries, setExperienceEntries] = useState<CmsExperienceEntry[]>(
    DEFAULT_ABOUT_STATE.experienceEntries
  );

  const [loadedData, setLoadedData] = useState<Partial<AboutPageDocument>>(DEFAULT_ABOUT_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const applyLoadedData = (data: Partial<AboutPageDocument>) => {
    setLoadedData(data);
    setTitle(data.title || DEFAULT_ABOUT_STATE.title);
    setIntroParagraphs(
      data.introParagraphs && data.introParagraphs.length > 0
        ? data.introParagraphs
        : DEFAULT_ABOUT_STATE.introParagraphs
    );
    setWorkEntries(
      data.workEntries && data.workEntries.length > 0
        ? data.workEntries
        : DEFAULT_ABOUT_STATE.workEntries
    );
    setMediaEntries(
      data.mediaEntries && data.mediaEntries.length > 0
        ? data.mediaEntries
        : DEFAULT_ABOUT_STATE.mediaEntries
    );
    setEducationEntries(
      data.educationEntries && data.educationEntries.length > 0
        ? data.educationEntries
        : DEFAULT_ABOUT_STATE.educationEntries
    );
    setExperienceEntries(
      data.experienceEntries && data.experienceEntries.length > 0
        ? data.experienceEntries
        : DEFAULT_ABOUT_STATE.experienceEntries
    );
  };

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        if (isDevPreview && typeof window !== 'undefined') {
          const cached = sessionStorage.getItem(DEV_STORAGE_KEY);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (mounted) {
              applyLoadedData(parsed);
              setIsLoading(false);
              return;
            }
          }
        }

        const data = await getAboutPageContent();
        if (mounted && data) {
          applyLoadedData(data);
        }
      } catch (err) {
        console.warn('[AboutEditor] Using baseline About state:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [isDevPreview]);

  const handleUpdateParagraph = (index: number, text: string) => {
    const updated = [...introParagraphs];
    updated[index] = text;
    setIntroParagraphs(updated);
  };

  const handleAddParagraph = () => {
    setIntroParagraphs([...introParagraphs, '']);
  };

  const handleDeleteParagraph = (index: number) => {
    if (introParagraphs.length <= 1) return;
    setIntroParagraphs(introParagraphs.filter((_, i) => i !== index));
  };

  const buildPayload = (): Partial<AboutPageDocument> => {
    const filteredParagraphs = introParagraphs.filter((p) => p.trim().length > 0);
    return {
      title: title.trim() || loadedData.title || DEFAULT_ABOUT_STATE.title,
      introParagraphs:
        filteredParagraphs.length > 0
          ? filteredParagraphs
          : loadedData.introParagraphs || DEFAULT_ABOUT_STATE.introParagraphs,
      workEntries,
      mediaEntries,
      educationEntries,
      experienceEntries,
      contact: loadedData.contact || DEFAULT_ABOUT_STATE.contact,
      seo: loadedData.seo || DEFAULT_ABOUT_STATE.seo,
      sectionOrder: loadedData.sectionOrder || DEFAULT_ABOUT_STATE.sectionOrder,
      sectionVisibility: loadedData.sectionVisibility || DEFAULT_ABOUT_STATE.sectionVisibility,
    };
  };

  const handleSave = async (publish: boolean) => {
    if (publish) setIsPublishing(true);
    else setIsSaving(true);
    setStatusMessage(null);

    const payload = buildPayload();

    try {
      if (isDevPreview && typeof window !== 'undefined') {
        sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(payload));
        setLoadedData(payload);
        setStatusMessage({
          type: 'success',
          text: publish
            ? 'About page published to local preview state.'
            : 'About page draft saved to local preview state.',
        });
        return;
      }

      await saveAboutPageContent(payload);
      setLoadedData(payload);
      setStatusMessage({
        type: 'success',
        text: publish
          ? 'About page published to Cloud Firestore.'
          : 'About page draft saved to Cloud Firestore.',
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save About page content.',
      });
    } finally {
      setIsSaving(false);
      setIsPublishing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading About...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      {/* Header & Two Controls: Save Draft, Publish / Update */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <h1 className="text-xl font-semibold tracking-tight text-foreground m-0">
          About
        </h1>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={isSaving || isPublishing}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] sm:min-h-0 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground disabled:opacity-50 cursor-pointer whitespace-nowrap"
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
            disabled={isSaving || isPublishing}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3.5 py-2 min-h-[38px] sm:min-h-0 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Publish / Update</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          role="alert"
          className={`rounded-lg border px-4 py-3 text-xs flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline cursor-pointer shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Section 1: Introduction & Biography */}
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground m-0">Introduction & Biography</h2>

        <div className="space-y-1.5">
          <label htmlFor="about-heading-input" className="text-xs font-medium text-foreground block">
            Page Heading
          </label>
          <input
            id="about-heading-input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-input bg-background text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            placeholder="About Aakash Das"
          />
        </div>

        <div className="space-y-2.5 pt-2 border-t border-border/60">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium text-foreground">Biography Paragraphs</span>
            <button
              type="button"
              onClick={handleAddParagraph}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 min-h-[36px] sm:min-h-0 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Paragraph</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {introParagraphs.map((para, idx) => (
              <div
                key={idx}
                className="p-3 rounded-lg border border-border bg-background space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Paragraph {String(idx + 1).padStart(2, '0')}
                  </span>
                  {introParagraphs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteParagraph(idx)}
                      aria-label={`Delete paragraph ${idx + 1}`}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 text-[11px] font-medium cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>

                <textarea
                  rows={3}
                  value={para}
                  onChange={(e) => handleUpdateParagraph(idx, e.target.value)}
                  placeholder="Enter biography paragraph..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-card text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 leading-relaxed resize-y"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 2: My Work */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground m-0">My Work</h2>
        <WorkEditor workEntries={workEntries} onChange={setWorkEntries} />
      </section>

      {/* Section 3: Conversations & Media */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground m-0">Conversations & Media</h2>
        <MediaMentionsEditor mediaEntries={mediaEntries} onChange={setMediaEntries} />
      </section>

      {/* Section 4: Education */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground m-0">Education</h2>
        <EducationEditor educationEntries={educationEntries} onChange={setEducationEntries} />
      </section>

      {/* Section 5: Professional Experience */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground m-0">Professional Experience</h2>
        <ExperienceEditor
          experienceEntries={experienceEntries}
          onChange={setExperienceEntries}
        />
      </section>
    </div>
  );
};
