import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  Mic,
  GraduationCap,
  Building2,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { WorkEditor } from './WorkEditor.tsx';
import { EducationEditor } from './EducationEditor.tsx';
import { MediaMentionsEditor } from './MediaMentionsEditor.tsx';
import { ExperienceEditor } from './ExperienceEditor.tsx';
import { AboutPreview } from './AboutPreview.tsx';
import { getAboutPageContent, saveAboutPageContent } from '../../../lib/cms/pages.repository.ts';
import type {
  AboutPageDocument,
  CmsWorkEntry,
  CmsMediaEntry,
  CmsEducationEntry,
  CmsExperienceEntry,
} from '../../../types/cms/pages.ts';

type AboutSubTab = 'intro' | 'work' | 'media' | 'education' | 'experience' | 'preview';

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
      link: {
        text: 'Visit RisePaisa',
        url: 'https://risepaisa.com',
        isExternal: true,
      },
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
      link: {
        text: 'Explore Resources',
        url: '/resources',
        isExternal: false,
      },
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
  contact: {
    visible: true,
    showEmail: true,
    showSocial: true,
  },
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
    description: "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education.",
  },
};

const DEV_STORAGE_KEY = 'aakashdas_cms_about_preview';

export const AboutEditor: React.FC<AboutEditorProps> = ({ isDevPreview = false }) => {
  const [activeSubTab, setActiveSubTab] = useState<AboutSubTab>('intro');
  const [title, setTitle] = useState(DEFAULT_ABOUT_STATE.title);
  const [introParagraphs, setIntroParagraphs] = useState<string[]>(DEFAULT_ABOUT_STATE.introParagraphs);
  const [workEntries, setWorkEntries] = useState<CmsWorkEntry[]>(DEFAULT_ABOUT_STATE.workEntries);
  const [mediaEntries, setMediaEntries] = useState<CmsMediaEntry[]>(DEFAULT_ABOUT_STATE.mediaEntries);
  const [educationEntries, setEducationEntries] = useState<CmsEducationEntry[]>(DEFAULT_ABOUT_STATE.educationEntries);
  const [experienceEntries, setExperienceEntries] = useState<CmsExperienceEntry[]>(DEFAULT_ABOUT_STATE.experienceEntries);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fixed section order & visibility
  const fixedSectionOrder = ['about-intro', 'work', 'media', 'education', 'experience', 'contact'];
  const fixedSectionVisibility = {
    'about-intro': true,
    work: true,
    media: true,
    education: true,
    experience: true,
    contact: true,
  };

  // Load baseline on mount
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
        console.warn('Could not load About page content from Firestore, using baseline:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, [isDevPreview]);

  const applyLoadedData = (data: Partial<AboutPageDocument>) => {
    if (data.title) setTitle(data.title);
    if (data.introParagraphs && data.introParagraphs.length > 0) setIntroParagraphs(data.introParagraphs);
    if (data.workEntries && data.workEntries.length > 0) {
      setWorkEntries(data.workEntries);
    } else {
      setWorkEntries(DEFAULT_ABOUT_STATE.workEntries);
    }
    if (data.mediaEntries && data.mediaEntries.length > 0) {
      setMediaEntries(data.mediaEntries);
    } else {
      setMediaEntries(DEFAULT_ABOUT_STATE.mediaEntries);
    }
    if (data.educationEntries && data.educationEntries.length > 0) {
      setEducationEntries(data.educationEntries);
    } else {
      setEducationEntries(DEFAULT_ABOUT_STATE.educationEntries);
    }
    if (data.experienceEntries && data.experienceEntries.length > 0) {
      setExperienceEntries(data.experienceEntries);
    } else {
      setExperienceEntries(DEFAULT_ABOUT_STATE.experienceEntries);
    }
    setIsDirty(false);
  };

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  // Intro paragraph operations
  const handleUpdateParagraph = (index: number, text: string) => {
    const updated = [...introParagraphs];
    updated[index] = text;
    setIntroParagraphs(updated);
    markDirty();
  };

  const handleAddParagraph = () => {
    setIntroParagraphs([...introParagraphs, '']);
    markDirty();
  };

  const handleDeleteParagraph = (index: number) => {
    if (introParagraphs.length <= 1) return;
    setIntroParagraphs(introParagraphs.filter((_, i) => i !== index));
    markDirty();
  };

  const handleMoveParagraphUp = (index: number) => {
    if (index === 0) return;
    const updated = [...introParagraphs];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    setIntroParagraphs(updated);
    markDirty();
  };

  const handleMoveParagraphDown = (index: number) => {
    if (index === introParagraphs.length - 1) return;
    const updated = [...introParagraphs];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    setIntroParagraphs(updated);
    markDirty();
  };

  // Build current state payload
  const buildPayload = (): Partial<AboutPageDocument> => ({
    title,
    introParagraphs: introParagraphs.filter((p) => p.trim().length > 0),
    workEntries,
    mediaEntries,
    educationEntries,
    experienceEntries,
    contact: {
      visible: true,
      showEmail: true,
      showSocial: true,
    },
    sectionOrder: fixedSectionOrder,
    sectionVisibility: fixedSectionVisibility,
  });

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setStatusMessage(null);

    const payload = buildPayload();

    try {
      if (isDevPreview && typeof window !== 'undefined') {
        sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(payload));
        setIsDirty(false);
        setStatusMessage({
          type: 'success',
          text: 'About page draft saved to local preview state.',
        });
        setIsSaving(false);
        return;
      }

      await saveAboutPageContent(payload);
      setIsDirty(false);
      setStatusMessage({
        type: 'success',
        text: 'About page draft saved successfully to Cloud Firestore.',
      });
    } catch (err: any) {
      console.error('Error saving about page:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to save About page draft.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setStatusMessage(null);

    const payload = buildPayload();

    try {
      if (isDevPreview && typeof window !== 'undefined') {
        sessionStorage.setItem(DEV_STORAGE_KEY, JSON.stringify(payload));
        setIsDirty(false);
        setStatusMessage({
          type: 'success',
          text: 'About page published to local preview state. (Live Firestore write disabled in Dev Preview)',
        });
        setIsPublishing(false);
        return;
      }

      await saveAboutPageContent(payload);
      setIsDirty(false);
      setStatusMessage({
        type: 'success',
        text: 'About page successfully published to Cloud Firestore.',
      });
    } catch (err: any) {
      console.error('Error publishing about page:', err);
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Failed to publish About page content.',
      });
    } finally {
      setIsPublishing(false);
    }
  };

  const handleResetToBaseline = () => {
    if (confirm('Discard unsaved edits and reset to default content?')) {
      applyLoadedData(DEFAULT_ABOUT_STATE);
      if (typeof window !== 'undefined' && isDevPreview) {
        sessionStorage.removeItem(DEV_STORAGE_KEY);
      }
      setIsDirty(false);
      setStatusMessage({
        type: 'success',
        text: 'About page reset to default baseline.',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center space-y-3 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <p className="text-sm">Loading About Page CMS...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2 m-0">
              <User className="w-5 h-5 text-primary" />
              About Page CMS
            </h2>
            {isDirty && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 m-0">
            Manage your biography narrative, initiatives, media features, education, and professional experience.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              type="button"
              onClick={handleResetToBaseline}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-xl border border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-xl border border-border bg-card hover:bg-secondary text-foreground transition-colors cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center gap-1.5 h-9 px-4 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-xs cursor-pointer"
          >
            {isPublishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            <span>Publish</span>
          </button>
        </div>
      </div>

      {/* Status Feedback Message */}
      {statusMessage && (
        <div
          role="alert"
          className={`rounded-xl border p-3.5 text-xs flex items-center justify-between gap-3 ${
            statusMessage.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-[11px] underline cursor-pointer hover:opacity-80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 5 Management Areas + Live Preview Sub-tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/60 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('intro')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'intro'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Intro & Bio</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('work')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'work'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>My Work</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border">
            {workEntries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('media')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'media'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Conversations & Media</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border">
            {mediaEntries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('education')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'education'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" />
          <span>Education</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border">
            {educationEntries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('experience')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'experience'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Professional Experience</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border">
            {experienceEntries.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('preview')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            activeSubTab === 'preview'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Eye className="w-3.5 h-3.5 text-primary" />
          <span>Live Preview</span>
        </button>
      </div>

      {/* Sub Tab Content */}
      <div className="pt-2">
        {activeSubTab === 'intro' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground m-0">
                Introduction & Biography
              </h3>
              <p className="text-xs text-muted-foreground m-0">
                Manage your introduction heading and biography narrative in presentation order.
              </p>
            </div>

            {/* Page Heading Card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-2xs">
              <label className="text-xs font-semibold text-foreground block">
                Page Heading
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  markDirty();
                }}
                className="w-full px-3 py-2 text-sm font-semibold rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="About Aakash Das"
              />
            </div>

            {/* Paragraphs List Card */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground m-0">
                    Narrative Paragraphs ({introParagraphs.length})
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 m-0">
                    Paragraphs appear on the public About page in the exact sequence shown below.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddParagraph}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Paragraph</span>
                </button>
              </div>

              <div className="space-y-3">
                {introParagraphs.map((para, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border border-border bg-secondary/20 space-y-2 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium border border-border bg-card text-muted-foreground">
                        Paragraph {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveParagraphUp(idx)}
                          disabled={idx === 0}
                          title="Move up"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveParagraphDown(idx)}
                          disabled={idx === introParagraphs.length - 1}
                          title="Move down"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        {introParagraphs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteParagraph(idx)}
                            className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                            title="Delete paragraph"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <textarea
                      rows={3}
                      value={para}
                      onChange={(e) => handleUpdateParagraph(idx, e.target.value)}
                      placeholder="Enter biography paragraph text..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed resize-y"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'work' && (
          <WorkEditor
            workEntries={workEntries}
            onChange={(updated) => {
              setWorkEntries(updated);
              markDirty();
            }}
          />
        )}

        {activeSubTab === 'media' && (
          <MediaMentionsEditor
            mediaEntries={mediaEntries}
            onChange={(updated) => {
              setMediaEntries(updated);
              markDirty();
            }}
          />
        )}

        {activeSubTab === 'education' && (
          <EducationEditor
            educationEntries={educationEntries}
            onChange={(updated) => {
              setEducationEntries(updated);
              markDirty();
            }}
          />
        )}

        {activeSubTab === 'experience' && (
          <ExperienceEditor
            experienceEntries={experienceEntries}
            onChange={(updated) => {
              setExperienceEntries(updated);
              markDirty();
            }}
          />
        )}

        {activeSubTab === 'preview' && (
          <AboutPreview
            title={title}
            introParagraphs={introParagraphs}
            workEntries={workEntries}
            mediaEntries={mediaEntries}
            educationEntries={educationEntries}
            experienceEntries={experienceEntries}
            contact={{
              visible: true,
              showEmail: true,
              showSocial: true,
            }}
            sectionOrder={fixedSectionOrder}
            sectionVisibility={fixedSectionVisibility}
          />
        )}
      </div>
    </div>
  );
};
