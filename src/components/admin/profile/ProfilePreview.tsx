import React from 'react';
import { Mail, ArrowUpRight, MapPin, Sparkles } from 'lucide-react';
import type { CmsSocialLink } from '../../../types/cms/siteSettings.ts';
import type { ContactInfoState } from './ContactEditor.tsx';

interface ProfilePreviewProps {
  fullName: string;
  displayName: string;
  tagline: string;
  positioning: string;
  shortDescription: string;
  profileImage: string;
  profileImageAlt: string;
  biographyParagraphs: string[];
  socialLinks: CmsSocialLink[];
  contact: ContactInfoState;
}

export const ProfilePreview: React.FC<ProfilePreviewProps> = ({
  fullName,
  displayName,
  tagline,
  positioning,
  shortDescription,
  profileImage,
  profileImageAlt,
  biographyParagraphs,
  socialLinks,
  contact,
}) => {
  const visibleSocials = socialLinks.filter((s) => s.featured);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground m-0">
            Live Frontend Preview
          </h3>
          <p className="text-xs text-muted-foreground m-0">
            Previewing how your changes will render on the public website.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono bg-secondary border border-border text-foreground">
          <Sparkles className="w-3 h-3 text-primary" />
          <span>Real-time Rendering</span>
        </span>
      </div>

      {/* Preview Container */}
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 space-y-8 shadow-xs">
        {/* Header Preview */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-border/80 pb-6">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden bg-secondary border border-border shrink-0 shadow-xs">
            <img
              src={profileImage || '/images/aakash-das.webp'}
              alt={profileImageAlt || fullName}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/aakash-das.webp';
              }}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground m-0">
                {fullName || 'Aakash Das'}
              </h1>
              <span className="text-xs font-mono text-muted-foreground">
                (@{displayName || 'Aakash'})
              </span>
            </div>
            <div className="text-xs font-medium text-primary">
              {tagline || 'Founder, Finance Specialist & Technology Builder'}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-3">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-foreground" />
                <span>{contact.location || 'Kathmandu, Nepal'}</span>
              </span>
              <span>•</span>
              <span>{positioning || 'Building, learning and sharing along the way.'}</span>
            </div>
          </div>
        </div>

        {/* Biography Paragraphs Preview */}
        <div className="space-y-3.5 max-w-3xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground font-mono m-0">
            About {displayName || 'Aakash'}
          </h2>
          {biographyParagraphs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No biography paragraphs configured.</p>
          ) : (
            biographyParagraphs.map((paragraph, idx) => (
              <p
                key={idx}
                className="text-xs sm:text-sm text-foreground/90 leading-relaxed font-normal m-0"
              >
                {paragraph}
              </p>
            ))
          )}
        </div>

        {/* Get in Touch Preview */}
        <div className="border-t border-border/80 pt-6 space-y-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-foreground m-0">
            Get in Touch (Preview)
          </h2>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Primary Email CTA */}
            <a
              href={`mailto:${contact.email}`}
              onClick={(e) => e.preventDefault()}
              className="inline-flex items-center gap-2 h-9 px-3.5 text-xs font-mono font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-2xs no-underline"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{contact.email || 'contact@aakashdas.live'}</span>
            </a>

            {/* Social Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {visibleSocials.map((social) => (
                <span
                  key={social.id}
                  className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-medium rounded-md border border-input bg-background text-foreground shadow-2xs"
                >
                  <span>{social.label}</span>
                  <ArrowUpRight className="w-3 h-3 text-muted-foreground/70" />
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
