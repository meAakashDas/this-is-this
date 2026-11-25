import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { CmsSocialLink } from '../../../types/cms/siteSettings.ts';
import { BiographyEditor } from './BiographyEditor.tsx';
import { ContactEditor, type ContactInfoState } from './ContactEditor.tsx';
import { ImagePreview, ImageUploader, type ImageMetaInfo } from '../media/index.ts';
import { getSiteSettings, saveSiteSettings } from '../../../lib/cms/siteSettings.repository.ts';
import {
  getAboutPageContent,
  saveAboutPageContent,
  saveHomePageContent,
} from '../../../lib/cms/pages.repository.ts';
import { compressImageFile } from '../../../utils/imageCompressor.ts';
import { isTemporaryBlobUrl, sanitizeAssetUrl } from '../../../lib/cms/sanitize.ts';

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

const DEFAULT_STATE: ProfileFormState = {
  fullName: 'Aakash Das',
  displayName: 'Aakash Das',
  tagline: 'Founder, Finance Specialist & Technology Builder',
  positioning: 'Building, learning and sharing along the way.',
  shortDescription: 'Personal archive, educational resources, and writing by Aakash Das.',
  identity: 'me.aakashdas',
  location: 'Kathmandu, Nepal',
  profileImage: '/images/aakash-das.webp',
  profileImageAlt: 'Aakash Das',
  biographyParagraphs: [
    "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education, making complex financial topics easier to understand through practical content and digital learning resources.",
    "My work focuses on Nepal's financial system, including personal finance, banking, taxation, fintech, financial literacy, and the stock market. Through RisePaisa, I aim to make reliable financial knowledge more accessible and help students, young professionals, and everyday learners make better-informed financial decisions.",
    "Alongside my work in finance education, I'm studying Information Technology and exploring how technology can improve the way people learn, access information, and manage their finances.",
  ],
  socialLinks: [],
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
  const [formData, setFormData] = useState<ProfileFormState>(DEFAULT_STATE);
  const [initialData, setInitialData] = useState<ProfileFormState>(DEFAULT_STATE);
  const [imageMeta, setImageMeta] = useState<ImageMetaInfo | undefined>(undefined);

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
            // Fall through to live/defaults
          }
        }
      }

      try {
        const [settings, about] = await Promise.all([
          getSiteSettings().catch(() => null),
          getAboutPageContent().catch(() => null),
        ]);

        if (isMounted && settings) {
          const hadBlob = isTemporaryBlobUrl(settings.profileImage);
          const cleanImage = sanitizeAssetUrl(settings.profileImage, DEFAULT_STATE.profileImage);
          const loaded: ProfileFormState = {
            ...DEFAULT_STATE,
            fullName: settings.fullName || DEFAULT_STATE.fullName,
            displayName: settings.displayName || DEFAULT_STATE.displayName,
            tagline: settings.tagline || DEFAULT_STATE.tagline,
            positioning: settings.positioning || DEFAULT_STATE.positioning,
            shortDescription: settings.shortDescription || DEFAULT_STATE.shortDescription,
            identity: settings.identity || DEFAULT_STATE.identity,
            location: settings.location || DEFAULT_STATE.location,
            profileImage: cleanImage,
            socialLinks:
              settings.socialLinks && settings.socialLinks.length > 0 ? settings.socialLinks : [],
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
          setInitialData(hadBlob ? { ...loaded, profileImage: settings.profileImage } : loaded);
          if (hadBlob) {
            setSaveStatus({
              type: 'error',
              message:
                'Detected a temporary blob: profile image in Firestore and restored the default image. Click "Save Profile" to update.',
            });
          }
        }
      } catch (err) {
        console.warn('[ProfileEditor] Using default profile baseline:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isDevPreview]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    const safeProfileImage = sanitizeAssetUrl(formData.profileImage, DEFAULT_STATE.profileImage);
    const cleanedParagraphs = formData.biographyParagraphs.filter((p) => p.trim().length > 0);
    const payloadToSave: ProfileFormState = {
      ...initialData,
      ...formData,
      fullName: formData.fullName.trim() || initialData.fullName,
      displayName: formData.displayName.trim() || initialData.displayName,
      tagline: formData.tagline.trim() || initialData.tagline,
      profileImage: safeProfileImage,
      profileImageAlt: formData.profileImageAlt.trim() || formData.fullName.trim() || 'Aakash Das',
      biographyParagraphs:
        cleanedParagraphs.length > 0 ? cleanedParagraphs : initialData.biographyParagraphs,
      contact: {
        ...initialData.contact,
        ...formData.contact,
        email: formData.contact.email.trim() || initialData.contact.email,
        phone: formData.contact.phone.trim() || initialData.contact.phone,
        whatsappNumber:
          formData.contact.whatsappNumber.trim() || initialData.contact.whatsappNumber,
      },
    };

    if (isDevPreview) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payloadToSave));
      }
      setFormData(payloadToSave);
      setInitialData(payloadToSave);
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: 'Profile saved to local preview state.',
      });
      return;
    }

    try {
      await Promise.all([
        saveSiteSettings({
          fullName: payloadToSave.fullName,
          displayName: payloadToSave.displayName,
          tagline: payloadToSave.tagline,
          positioning: initialData.positioning,
          shortDescription: initialData.shortDescription,
          identity: initialData.identity,
          location: initialData.location,
          profileImage: safeProfileImage,
          email: payloadToSave.contact.email,
          phone: payloadToSave.contact.phone,
          whatsappNumber: payloadToSave.contact.whatsappNumber,
          ...(initialData.socialLinks.length > 0 ? { socialLinks: initialData.socialLinks } : {}),
        }),
        saveAboutPageContent({
          introParagraphs: payloadToSave.biographyParagraphs,
        }),
        saveHomePageContent({
          heroPhotoUrl: safeProfileImage,
          heroPhotoAlt: payloadToSave.profileImageAlt,
        }),
      ]);

      setFormData(payloadToSave);
      setInitialData(payloadToSave);
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: 'Profile saved to Cloud Firestore.',
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
    setFormData(initialData);
    setSaveStatus(null);
  };

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      {/* Header & Save */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground m-0">
            Profile
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
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
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

      {/* Section 1: Identity & Photo */}
      <section className="p-5 rounded-xl border border-border bg-card space-y-5">
        <h2 className="text-sm font-semibold text-foreground m-0">Identity & Photograph</h2>

        <div className="space-y-3">
          {formData.profileImage ? (
            <ImagePreview
              src={formData.profileImage}
              alt={formData.profileImageAlt}
              metadata={imageMeta}
              isTemporary={isDevPreview}
              onRemove={() =>
                setFormData((prev) => ({ ...prev, profileImage: '', profileImageAlt: '' }))
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
              onImageSelected={(url, meta) => {
                setFormData((prev) => ({ ...prev, profileImage: url }));
                setImageMeta(meta);
              }}
            />
          )}

          <div className="space-y-1.5">
            <label htmlFor="profile-photo-alt" className="text-xs font-medium text-foreground block">
              Photo Alt Text
            </label>
            <input
              id="profile-photo-alt"
              type="text"
              value={formData.profileImageAlt}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, profileImageAlt: e.target.value }))
              }
              placeholder="Aakash Das portrait"
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/60">
          <div className="space-y-1.5">
            <label htmlFor="profile-full-name" className="text-xs font-medium text-foreground block">
              Full Name
            </label>
            <input
              id="profile-full-name"
              type="text"
              value={formData.fullName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, fullName: e.target.value }))
              }
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="profile-display-name" className="text-xs font-medium text-foreground block">
              Display Name
            </label>
            <input
              id="profile-display-name"
              type="text"
              value={formData.displayName}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, displayName: e.target.value }))
              }
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="profile-headline" className="text-xs font-medium text-foreground block">
              Headline
            </label>
            <input
              id="profile-headline"
              type="text"
              value={formData.tagline}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, tagline: e.target.value }))
              }
              placeholder="Founder, Finance Specialist & Technology Builder"
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Biography */}
      <section className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-semibold text-foreground m-0">Biography</h2>
        <BiographyEditor
          paragraphs={formData.biographyParagraphs}
          onChange={(paragraphs) =>
            setFormData((prev) => ({ ...prev, biographyParagraphs: paragraphs }))
          }
        />
      </section>

      {/* Section 3: Contact */}
      <section className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-semibold text-foreground m-0">Contact</h2>
        <ContactEditor
          contact={formData.contact}
          onChange={(contact) =>
            setFormData((prev) => ({ ...prev, contact }))
          }
        />
      </section>
    </div>
  );
};
