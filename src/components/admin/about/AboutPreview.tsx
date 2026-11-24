import React, { useState } from 'react';
import {
  Monitor,
  Smartphone,
  ArrowRight,
  ArrowUpRight,
  Mail,
  Calendar,
} from 'lucide-react';
import type {
  CmsWorkEntry,
  CmsMediaEntry,
  CmsEducationEntry,
  CmsExperienceEntry,
  AboutPageDocument,
} from '../../../types/cms/pages.ts';

interface AboutPreviewProps {
  title: string;
  introParagraphs: string[];
  workEntries: CmsWorkEntry[];
  mediaEntries: CmsMediaEntry[];
  educationEntries: CmsEducationEntry[];
  experienceEntries: CmsExperienceEntry[];
  contact: AboutPageDocument['contact'];
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
}

const DEFAULT_ORDER = ['intro', 'work', 'media', 'education', 'experience', 'contact'];

export const AboutPreview: React.FC<AboutPreviewProps> = ({
  title,
  introParagraphs,
  workEntries,
  mediaEntries,
  educationEntries,
  experienceEntries,
  contact,
  sectionOrder,
  sectionVisibility,
}) => {
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');

  const currentOrder = sectionOrder.length > 0 ? sectionOrder : DEFAULT_ORDER;
  const isSectionVisible = (id: string) => sectionVisibility[id] !== false;

  return (
    <div className="space-y-4">
      {/* Viewport Toolbar */}
      <div className="flex items-center justify-between border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Preview Device:</span>
          <div className="inline-flex rounded-lg border border-border bg-secondary/50 p-0.5">
            <button
              type="button"
              onClick={() => setDevice('desktop')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                device === 'desktop'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Desktop
            </button>
            <button
              type="button"
              onClick={() => setDevice('mobile')}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                device === 'mobile'
                  ? 'bg-background text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Mobile (390px)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live Preview • {device === 'desktop' ? 'Fluid Width' : '390px Viewport'}
        </div>
      </div>

      {/* Preview Container Frame */}
      <div className="flex justify-center bg-muted/20 rounded-xl p-4 md:p-6 border border-border/60 overflow-hidden">
        <div
          className={`transition-all duration-300 bg-background text-foreground rounded-2xl shadow-lg border border-border overflow-hidden ${
            device === 'desktop' ? 'w-full max-w-4xl' : 'w-[390px] min-w-[390px]'
          }`}
        >
          {/* Mock Browser Header */}
          <div className="px-4 py-2.5 bg-muted/40 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            </div>
            <div className="text-[11px] font-mono text-muted-foreground bg-background/80 px-4 py-0.5 rounded-md border border-border/60">
              aakashdas.live/about
            </div>
            <div className="w-10"></div>
          </div>

          {/* Rendered About Page Preview Content */}
          <div className="p-6 md:p-10 space-y-8">
            {currentOrder.map((sectionId) => {
              if (!isSectionVisible(sectionId)) return null;

              if (sectionId === 'intro') {
                return (
                  <div key="intro" className="space-y-4">
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                      {title || 'About Aakash Das'}
                    </h1>
                    <div className="space-y-3 max-w-3xl text-sm md:text-base leading-relaxed text-muted-foreground">
                      {introParagraphs.length > 0 ? (
                        introParagraphs.map((para, i) => (
                          <p key={i} className={i === 0 ? 'text-foreground/90 font-normal' : ''}>
                            {para}
                          </p>
                        ))
                      ) : (
                        <p className="text-muted-foreground italic">No bio paragraphs added yet.</p>
                      )}
                    </div>
                    <div className="h-px bg-border w-full mt-6" />
                  </div>
                );
              }

              if (sectionId === 'work') {
                const visibleWorks = workEntries.filter((w) => w.visible);
                if (visibleWorks.length === 0) return null;

                return (
                  <div key="work" className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      My Work
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {visibleWorks.map((work) => (
                        <div
                          key={work.id || work.index}
                          className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs"
                        >
                          <div>
                            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground mb-2 inline-block">
                              {work.index}
                            </span>
                            <h3 className="text-base font-semibold text-foreground mb-1">
                              {work.name}
                            </h3>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {work.desc}
                            </p>
                          </div>
                          {work.link && work.link.text && (
                            <div className="pt-3 mt-3 border-t border-border flex items-center gap-1 text-xs font-medium text-foreground">
                              <span>{work.link.text}</span>
                              {work.link.isExternal ? (
                                <ArrowUpRight className="w-3 h-3 text-muted-foreground" />
                              ) : (
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-border w-full mt-6" />
                  </div>
                );
              }

              if (sectionId === 'media') {
                const visibleMedia = mediaEntries.filter((m) => m.visible);
                if (visibleMedia.length === 0) return null;

                return (
                  <div key="media" className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      Conversations & Media
                    </h2>
                    <div className="space-y-3">
                      {visibleMedia.map((media) => (
                        <div
                          key={media.id}
                          className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">
                              {media.role}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              {media.format}
                            </span>
                          </div>
                          <h3 className="text-base font-semibold text-foreground">
                            {media.show}
                          </h3>
                          <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                            {media.desc}
                          </p>
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-border w-full mt-6" />
                  </div>
                );
              }

              if (sectionId === 'education') {
                const visibleEdus = educationEntries.filter((e) => e.visible);
                if (visibleEdus.length === 0) return null;

                return (
                  <div key="education" className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      Education
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {visibleEdus.map((edu) => (
                        <div
                          key={edu.id || edu.index}
                          className="rounded-xl border border-border bg-card p-4 flex flex-col justify-between shadow-xs space-y-2"
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground">
                                {edu.index}
                              </span>
                              {edu.period && (
                                <span className="text-xs font-mono text-muted-foreground">
                                  {edu.period}
                                </span>
                              )}
                            </div>
                            <h3 className="text-base font-semibold text-foreground">
                              {edu.title}
                            </h3>
                            {edu.degree && (
                              <p className="text-xs font-medium text-foreground">{edu.degree}</p>
                            )}
                            {edu.institution && (
                              <p className="text-xs text-muted-foreground">{edu.institution}</p>
                            )}
                            {edu.desc && (
                              <p className="text-xs text-muted-foreground leading-relaxed mt-1">{edu.desc}</p>
                            )}
                          </div>
                          {edu.status && (
                            <div className="inline-flex items-center gap-1.5 pt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              <span>{edu.status}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-border w-full mt-6" />
                  </div>
                );
              }

              if (sectionId === 'experience') {
                const visibleExps = experienceEntries.filter((e) => e.visible);
                if (visibleExps.length === 0) return null;

                return (
                  <div key="experience" className="space-y-4">
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      Professional Experience
                    </h2>
                    <div className="space-y-3">
                      {visibleExps.map((exp) => (
                        <div
                          key={exp.id}
                          className="rounded-xl border border-border bg-card p-4 space-y-1.5 shadow-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">
                              {exp.position} at {exp.organization}
                            </span>
                            {exp.period && (
                              <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {exp.period}
                              </span>
                            )}
                          </div>
                          {exp.desc && (
                            <p className="text-xs text-muted-foreground leading-relaxed">{exp.desc}</p>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-border w-full mt-6" />
                  </div>
                );
              }

              if (sectionId === 'contact' && contact.visible) {
                return (
                  <div key="contact" className="space-y-4 pt-2">
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                      Get in Touch
                    </h2>
                    <div className="flex items-center gap-3 flex-wrap">
                      {contact.showEmail && (
                        <div className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-mono font-medium rounded-md bg-primary text-primary-foreground shadow-xs">
                          <Mail className="w-3.5 h-3.5" />
                          <span>contact@aakashdas.live</span>
                        </div>
                      )}
                      {contact.showSocial && (
                        <div className="flex items-center gap-2 flex-wrap">
                          {['YouTube', 'Instagram', 'LinkedIn', 'X'].map((plat) => (
                            <div
                              key={plat}
                              className="inline-flex items-center gap-1 h-9 px-3 text-xs font-medium rounded-md border border-input bg-background text-foreground shadow-xs"
                            >
                              <span>{plat}</span>
                              <ArrowUpRight className="w-3 h-3 text-muted-foreground/70" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return null;
            })}

            {/* Discreet Admin Link */}
            <div className="pt-8 pb-2 text-center">
              <span className="text-[11px] font-normal text-muted-foreground/35 cursor-default">
                Sign in
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
