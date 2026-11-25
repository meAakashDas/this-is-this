import React from 'react';
import { User, Sparkles, ExternalLink, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { ImagePreview, ImageUploader, type ImageMetaInfo } from '../media/index.ts';
import { compressImageFile } from '../../../utils/imageCompressor.ts';

export interface HeroFormState {
  heroHeadline: string;
  heroRolePrefix: string;
  heroRoleBrand: string;
  heroRoleUrl: string;
  heroTagline: string;
  heroPhotoUrl: string;
  heroPhotoAlt: string;
  primaryCta: {
    text: string;
    url: string;
    visible: boolean;
  };
  secondaryCta: {
    text: string;
    url: string;
    visible: boolean;
  };
}

interface HeroEditorProps {
  hero: HeroFormState;
  isDevPreview?: boolean;
  onChange: (updated: HeroFormState) => void;
}

export const HeroEditor: React.FC<HeroEditorProps> = ({
  hero,
  isDevPreview = false,
  onChange,
}) => {
  const handleChange = (field: keyof HeroFormState, value: any) => {
    onChange({
      ...hero,
      [field]: value,
    });
  };

  const handleCtaChange = (
    ctaKey: 'primaryCta' | 'secondaryCta',
    field: 'text' | 'url' | 'visible',
    value: any
  ) => {
    onChange({
      ...hero,
      [ctaKey]: {
        ...hero[ctaKey],
        [field]: value,
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Hero Photograph Card */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <h4 className="text-xs font-semibold text-foreground m-0">
            Profile Photograph
          </h4>
        </div>

        {hero.heroPhotoUrl ? (
          <ImagePreview
            src={hero.heroPhotoUrl}
            alt={hero.heroPhotoAlt || 'Aakash Das'}
            isTemporary={isDevPreview}
            onRemove={() =>
              onChange({
                ...hero,
                heroPhotoUrl: '',
                heroPhotoAlt: '',
              })
            }
            onReplace={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/webp,image/jpeg,image/png';
              input.onchange = async (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (file) {
                  try {
                    const compressed = await compressImageFile(file, 800, 800, 0.82);
                    onChange({ ...hero, heroPhotoUrl: compressed.dataUrl });
                  } catch (err) {
                    console.error('Failed to compress hero image:', err);
                  }
                }
              };
              input.click();
            }}
          />
        ) : (
          <ImageUploader
            isDevPreview={isDevPreview}
            onImageSelected={(url) => {
              onChange({ ...hero, heroPhotoUrl: url });
            }}
          />
        )}

        <div className="space-y-1.5 pt-2 border-t border-border/60">
          <label className="text-[11px] font-mono text-muted-foreground block">
            Photograph Alt Text (Accessibility)
          </label>
          <input
            type="text"
            value={hero.heroPhotoAlt}
            onChange={(e) => handleChange('heroPhotoAlt', e.target.value)}
            placeholder="Aakash Das portrait"
            className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Typography & Headline Inputs */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
        <h4 className="text-xs font-semibold text-foreground m-0">
          Hero Copy & Typography
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground block">
              Main Display Headline
            </label>
            <input
              type="text"
              value={hero.heroHeadline}
              onChange={(e) => handleChange('heroHeadline', e.target.value)}
              placeholder="I'm Aakash Das."
              className="w-full text-sm font-semibold rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Role Prefix
            </label>
            <input
              type="text"
              value={hero.heroRolePrefix}
              onChange={(e) => handleChange('heroRolePrefix', e.target.value)}
              placeholder="Founder of"
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground block">
              Role Brand / Organization
            </label>
            <input
              type="text"
              value={hero.heroRoleBrand}
              onChange={(e) => handleChange('heroRoleBrand', e.target.value)}
              placeholder="RisePaisa"
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground block">
              Brand Destination URL
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="url"
                value={hero.heroRoleUrl}
                onChange={(e) => handleChange('heroRoleUrl', e.target.value)}
                placeholder="https://risepaisa.com"
                className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {hero.heroRoleUrl && (
                <a
                  href={hero.heroRoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 inline-flex items-center justify-center rounded-lg border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-medium text-foreground block">
              Personal Statement / Tagline
            </label>
            <textarea
              rows={2}
              value={hero.heroTagline}
              onChange={(e) => handleChange('heroTagline', e.target.value)}
              placeholder="I love learning, building, and sharing."
              className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
            />
          </div>
        </div>
      </div>

      {/* Call to Action Buttons */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
        <h4 className="text-xs font-semibold text-foreground m-0">
          Call to Action Buttons
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Primary CTA */}
          <div className="rounded-lg border border-border/80 p-4 space-y-3 bg-secondary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Primary Button
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCtaChange('primaryCta', 'visible', !hero.primaryCta.visible)
                }
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {hero.primaryCta.visible ? (
                  <>
                    <Eye className="w-3 h-3 text-emerald-500" />
                    <span>Visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Hidden</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground block">
                Button Label
              </label>
              <input
                type="text"
                value={hero.primaryCta.text}
                onChange={(e) =>
                  handleCtaChange('primaryCta', 'text', e.target.value)
                }
                placeholder="Explore free resources"
                className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground block">
                Destination Route / URL
              </label>
              <input
                type="text"
                value={hero.primaryCta.url}
                onChange={(e) =>
                  handleCtaChange('primaryCta', 'url', e.target.value)
                }
                placeholder="/resources"
                className="w-full text-xs font-mono rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Secondary CTA */}
          <div className="rounded-lg border border-border/80 p-4 space-y-3 bg-secondary/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Secondary Button
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCtaChange(
                    'secondaryCta',
                    'visible',
                    !hero.secondaryCta.visible
                  )
                }
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {hero.secondaryCta.visible ? (
                  <>
                    <Eye className="w-3 h-3 text-emerald-500" />
                    <span>Visible</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3 h-3" />
                    <span>Hidden</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground block">
                Button Label
              </label>
              <input
                type="text"
                value={hero.secondaryCta.text}
                onChange={(e) =>
                  handleCtaChange('secondaryCta', 'text', e.target.value)
                }
                placeholder="About me"
                className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-mono text-muted-foreground block">
                Destination Route / URL
              </label>
              <input
                type="text"
                value={hero.secondaryCta.url}
                onChange={(e) =>
                  handleCtaChange('secondaryCta', 'url', e.target.value)
                }
                placeholder="/about"
                className="w-full text-xs font-mono rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
