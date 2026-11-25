import React, { useState, useEffect } from 'react';
import {
  User,
  FileText,
  Share2,
  Phone,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import type { CmsSocialLink } from '../../../types/cms/siteSettings.ts';
import { BiographyEditor } from './BiographyEditor.tsx';
import { SocialLinksEditor } from './SocialLinksEditor.tsx';
import { ContactEditor, type ContactInfoState } from './ContactEditor.tsx';
import { ProfilePreview } from './ProfilePreview.tsx';
import { ImagePreview, ImageUploader, type ImageMetaInfo } from '../media/index.ts';
import { getSiteSettings, saveSiteSettings } from '../../../lib/cms/siteSettings.repository.ts';
import { getAboutPageContent, saveAboutPageContent, saveHomePageContent } from '../../../lib/cms/pages.repository.ts';
import { compressImageFile } from '../../../utils/imageCompressor.ts';

type ProfileSubTab = 'identity' | 'bio' | 'social' | 'contact' | 'preview';

interface ProfileEditorProps {
  isDevPreview?: boolean;
}

export interface ProfileFormState {
  fullName: string;
  displayName: string;
  tagline: string;
  positioning: string;
  shortDescription: string;
  identity: string;
  location: string;
  profileImage: string;
  profileImageAlt: string;
  biographyParagraphs: string[];
  socialLinks: CmsSocialLink[];
  contact: ContactInfoState;
}

// Initial default state based on real repository content
const DEFAULT_STATE: ProfileFormState = {
  fullName: 'Aakash Das',
  displayName: 'Aakash Das',
  tagline: 'Founder, Finance Specialist & Technology Builder',
  positioning: 'Building, learning and sharing along the way.',
  shortDescription:
    'Personal archive, educational resources, and writing by Aakash Das.',
  identity: 'me.aakashdas',
  location: 'Kathmandu, Nepal',
  profileImage: '/images/aakash-das.webp',
  profileImageAlt: 'Aakash Das',
  biographyParagraphs: [
    "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education, making complex financial topics easier to understand through practical content and digital learning resources.",
    "My work focuses on Nepal's financial system, including personal finance, banking, taxation, fintech, financial literacy, and the stock market. Through RisePaisa, I aim to make reliable financial knowledge more accessible and help students, young professionals, and everyday learners make better-informed financial decisions.",
    "Alongside my work in finance education, I'm studying Information Technology and exploring how technology can improve the way people learn, access information, and manage their finances.",
  ],
  socialLinks: [
    {
      id: 'social-1',
      order: 1,
      visible: true,
      platform: 'Instagram',
      label: 'Instagram',
      handle: '@me.aakashdas',
      url: 'https://instagram.com/me.aakashdas',
      icon: 'instagram',
      featured: true,
    },
    {
      id: 'social-2',
      order: 2,
      visible: true,
      platform: 'YouTube',
      label: 'YouTube',
      handle: '@me.aakashdas',
      url: 'https://youtube.com/@me.aakashdas',
      icon: 'youtube',
      featured: true,
    },
    {
      id: 'social-3',
      order: 3,
      visible: true,
      platform: 'TikTok',
      label: 'TikTok',
      handle: '@me.aakashdas',
      url: 'https://tiktok.com/@me.aakashdas',
      icon: 'tiktok',
      featured: true,
    },
    {
      id: 'social-4',
      order: 4,
      visible: true,
      platform: 'LinkedIn',
      label: 'LinkedIn',
      handle: 'me.aakashdas',
      url: 'https://linkedin.com/in/me-aakashdas',
      icon: 'linkedin',
      featured: true,
    },
    {
      id: 'social-5',
      order: 5,
      visible: true,
      platform: 'X (Twitter)',
      label: 'X',
      handle: '@me_aakashdas',
      url: 'https://x.com/me_aakashdas',
      icon: 'twitter',
      featured: true,
    },
    {
      id: 'social-6',
      order: 6,
      visible: true,
      platform: 'Facebook',
      label: 'Facebook',
      handle: 'me.aakashdas',
      url: 'https://facebook.com/me.aakashdas',
      icon: 'facebook',
      featured: true,
    },
  ],
  contact: {
    email: 'contact@aakashdas.live',
    secondaryEmail: 'aakashdas.photo@gmail.com',
    phone: '+977-XXXXXXXXXX',
    whatsappNumber: '977XXXXXXXXXX',
    contactUrl: '',
    location: 'Kathmandu, Nepal',
  },
};

const STORAGE_KEY = 'aakashdas_cms_profile_preview';

export const ProfileEditor: React.FC<ProfileEditorProps> = ({ isDevPreview = false }) => {
  const [subTab, setSubTab] = useState<ProfileSubTab>('identity');

  // Form states
  const [formData, setFormData] = useState<ProfileFormState>(DEFAULT_STATE);
  const [initialData, setInitialData] = useState<ProfileFormState>(DEFAULT_STATE);
  const [imageMeta, setImageMeta] = useState<ImageMetaInfo | undefined>({
    name: 'aakash-das.webp',
    width: 800,
    height: 800,
    sizeBytes: 245000,
    mimeType: 'image/webp',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Load initial data from Firebase or sessionStorage
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // In dev preview, restore from session if available
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

      // Try loading live Firestore data
      try {
        const [settings, about] = await Promise.all([
          getSiteSettings().catch(() => null),
          getAboutPageContent().catch(() => null),
        ]);

        if (isMounted && settings) {
          const loaded: ProfileFormState = {
            ...DEFAULT_STATE,
            fullName: settings.fullName || DEFAULT_STATE.fullName,
            displayName: settings.displayName || DEFAULT_STATE.displayName,
            tagline: settings.tagline || DEFAULT_STATE.tagline,
            positioning: settings.positioning || DEFAULT_STATE.positioning,
            shortDescription: settings.shortDescription || DEFAULT_STATE.shortDescription,
            identity: settings.identity || DEFAULT_STATE.identity,
            location: settings.location || DEFAULT_STATE.location,
            profileImage: settings.profileImage || DEFAULT_STATE.profileImage,
            socialLinks:
              settings.socialLinks && settings.socialLinks.length > 0
                ? settings.socialLinks
                : DEFAULT_STATE.socialLinks,
            biographyParagraphs:
              about?.introParagraphs && about.introParagraphs.length > 0
                ? about.introParagraphs
                : DEFAULT_STATE.biographyParagraphs,
            contact: {
              ...DEFAULT_STATE.contact,
              email: settings.email || DEFAULT_STATE.contact.email,
              phone: settings.phone || DEFAULT_STATE.contact.phone,
              whatsappNumber: settings.whatsappNumber || DEFAULT_STATE.contact.whatsappNumber,
              location: settings.location || DEFAULT_STATE.contact.location,
            },
          };
          setFormData(loaded);
          setInitialData(loaded);
        }
      } catch (err) {
        console.warn('[Profile Editor] Loaded default static profile baseline:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isDevPreview]);

  // Track if changes are dirty
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    // Development Preview Mode save: saves to local state and sessionStorage
    if (isDevPreview) {
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
        }
        setInitialData(formData);
        setIsSaving(false);
        setSaveStatus({
          type: 'success',
          message:
            'Profile saved to local preview state. (Live Firestore write disabled in Dev Preview)',
        });
      }, 400);
      return;
    }

    // Authenticated Production Mode save: write to Cloud Firestore
    try {
      await Promise.all([
        saveSiteSettings({
          fullName: formData.fullName,
          displayName: formData.displayName,
          tagline: formData.tagline,
          positioning: formData.positioning,
          shortDescription: formData.shortDescription,
          identity: formData.identity,
          location: formData.location,
          profileImage: formData.profileImage,
          email: formData.contact.email,
          phone: formData.contact.phone,
          whatsappNumber: formData.contact.whatsappNumber,
          socialLinks: formData.socialLinks,
        }),
        saveAboutPageContent({
          introParagraphs: formData.biographyParagraphs,
        }),
        saveHomePageContent({
          heroPhotoUrl: formData.profileImage,
          heroPhotoAlt: formData.profileImageAlt || formData.fullName,
        }),
      ]);

      setInitialData(formData);
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: 'Profile changes successfully published to Cloud Firestore.',
      });
    } catch (err) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus({
        type: 'error',
        message: `Failed to save profile: ${msg}`,
      });
    }
  };

  const handleReset = () => {
    if (confirm('Discard all unsaved changes to your profile?')) {
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
              Personal Profile CMS
            </h1>
            {isDirty && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 m-0">
            Manage your personal identity, biography paragraphs, social profiles, and contact details.
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
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 h-9 px-4 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving changes...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Status Notification Banner */}
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

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border/60 scrollbar-none">
        <button
          type="button"
          onClick={() => setSubTab('identity')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'identity'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Basic Identity</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('bio')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'bio'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Biography</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border">
            {formData.biographyParagraphs.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('social')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'social'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Social Media</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border">
            {formData.socialLinks.filter((s) => s.featured).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('contact')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'contact'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Contact Channels</span>
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

      {/* Tab Panels */}
      <div className="pt-2">
        {/* Tab 1: Basic Identity & Photo */}
        {subTab === 'identity' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground m-0">
                Personal Identity & Photograph
              </h3>
              <p className="text-xs text-muted-foreground m-0">
                Configure your public name, headline, tagline, and profile portrait.
              </p>
            </div>

            {/* Profile Image Section */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-foreground m-0">
                    Profile Photograph
                  </h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5 m-0">
                    Rendered in the hero section and public author avatars.
                  </p>
                </div>
              </div>

              {formData.profileImage ? (
                <ImagePreview
                  src={formData.profileImage}
                  alt={formData.profileImageAlt}
                  metadata={imageMeta}
                  isTemporary={isDevPreview}
                  onRemove={() =>
                    setFormData((prev) => ({
                      ...prev,
                      profileImage: '',
                      profileImageAlt: '',
                    }))
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
                          setFormData((prev) => ({ ...prev, profileImage: compressed.dataUrl }));
                          setImageMeta({
                            name: file.name,
                            sizeBytes: compressed.sizeBytes,
                            width: compressed.width,
                            height: compressed.height,
                            mimeType: compressed.mimeType,
                          });
                        } catch (err) {
                          console.error('Failed to compress profile image:', err);
                        }
                      }
                    };
                    input.click();
                  }}
                />
              ) : (
                <ImageUploader
                  isDevPreview={isDevPreview}
                  onImageSelected={(url, meta, isTemp) => {
                    setFormData((prev) => ({ ...prev, profileImage: url }));
                    setImageMeta(meta);
                  }}
                />
              )}

              {/* Alt text field */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <label className="text-[11px] font-mono text-muted-foreground block">
                  Image Alternative Text (Accessibility)
                </label>
                <input
                  type="text"
                  value={formData.profileImageAlt}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      profileImageAlt: e.target.value,
                    }))
                  }
                  placeholder="Aakash Das profile portrait"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            {/* Identity Text Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Display / Short Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Professional Title & Positioning Headline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, tagline: e.target.value }))
                  }
                  placeholder="Founder, Finance Specialist & Technology Builder"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.positioning}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, positioning: e.target.value }))
                  }
                  placeholder="Building, learning and sharing along the way."
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Short Description
                </label>
                <textarea
                  rows={3}
                  value={formData.shortDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shortDescription: e.target.value,
                    }))
                  }
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Online Identity Handle
                </label>
                <input
                  type="text"
                  value={formData.identity}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, identity: e.target.value }))
                  }
                  placeholder="me.aakashdas"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, location: e.target.value }))
                  }
                  placeholder="Kathmandu, Nepal"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Biography */}
        {subTab === 'bio' && (
          <BiographyEditor
            paragraphs={formData.biographyParagraphs}
            onChange={(paragraphs) =>
              setFormData((prev) => ({ ...prev, biographyParagraphs: paragraphs }))
            }
          />
        )}

        {/* Tab 3: Social Links */}
        {subTab === 'social' && (
          <SocialLinksEditor
            links={formData.socialLinks}
            onChange={(links) =>
              setFormData((prev) => ({ ...prev, socialLinks: links }))
            }
          />
        )}

        {/* Tab 4: Contact Channels */}
        {subTab === 'contact' && (
          <ContactEditor
            contact={formData.contact}
            onChange={(contact) =>
              setFormData((prev) => ({ ...prev, contact }))
            }
          />
        )}

        {/* Tab 5: Live Preview */}
        {subTab === 'preview' && (
          <ProfilePreview
            fullName={formData.fullName}
            displayName={formData.displayName}
            tagline={formData.tagline}
            positioning={formData.positioning}
            shortDescription={formData.shortDescription}
            profileImage={formData.profileImage}
            profileImageAlt={formData.profileImageAlt}
            biographyParagraphs={formData.biographyParagraphs}
            socialLinks={formData.socialLinks}
            contact={formData.contact}
          />
        )}
      </div>
    </div>
  );
};
