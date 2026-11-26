import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, CheckCircle2, AlertCircle, Loader2, Plus, Trash2 } from 'lucide-react';
import type {
  SiteSettingsDocument,
  CmsSocialLink,
  SocialPlatformIcon,
} from '../../../types/cms/siteSettings.ts';
import { getSiteSettings, saveSiteSettings } from '../../../lib/cms/siteSettings.repository.ts';
import { validateSiteSettings } from '../../../lib/cms/validation.ts';
import { sanitizeAssetUrl } from '../../../lib/cms/sanitize.ts';

interface WebsiteSettingsEditorProps {
  isDevPreview?: boolean;
}

const STORAGE_KEY = 'aakashdas_cms_settings_preview';

const PLATFORM_OPTIONS: Array<{
  platform: string;
  icon: SocialPlatformIcon;
  defaultDomain: string;
}> = [
  { platform: 'YouTube', icon: 'youtube', defaultDomain: 'https://youtube.com/@' },
  { platform: 'Instagram', icon: 'instagram', defaultDomain: 'https://instagram.com/' },
  { platform: 'LinkedIn', icon: 'linkedin', defaultDomain: 'https://linkedin.com/in/' },
  { platform: 'X (Twitter)', icon: 'twitter', defaultDomain: 'https://x.com/' },
  { platform: 'TikTok', icon: 'tiktok', defaultDomain: 'https://tiktok.com/@' },
  { platform: 'Facebook', icon: 'facebook', defaultDomain: 'https://facebook.com/' },
  { platform: 'GitHub', icon: 'link', defaultDomain: 'https://github.com/' },
  { platform: 'Custom', icon: 'link', defaultDomain: 'https://' },
];

const DEFAULT_SETTINGS: SiteSettingsDocument = {
  id: 'general',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: new Date().toISOString(),
  fullName: 'Aakash Das',
  displayName: 'Aakash Das',
  websiteTitle: 'Aakash Das',
  tagline: 'Founder, Finance Specialist & Technology Builder',
  positioning: 'Personal archive, educational resources, and writing by Aakash Das.',
  shortDescription:
    'Personal website of Aakash Das. Studying Information Technology at Softwarica College and building RisePaisa. Exploring technology, finance, productivity, and digital products.',
  profileImage: '/images/aakash-das.webp',
  email: 'contact@aakashdas.live',
  phone: '+977-XXXXXXXXXX',
  whatsappNumber: '977XXXXXXXXXX',
  location: 'Kathmandu, Nepal',
  identity: 'me.aakashdas',
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
  navItems: [
    { id: 'nav-1', label: 'Home', href: '/', order: 1, visible: true },
    { id: 'nav-2', label: 'About', href: '/about', order: 2, visible: true },
    { id: 'nav-3', label: 'Resources', href: '/resources', order: 3, visible: true },
    { id: 'nav-4', label: 'Journal', href: '/journal', order: 4, visible: true },
  ],
  footer: {
    showNav: true,
    showSocial: true,
    showContact: true,
    showDirectActions: true,
    copyrightText: '© 2025 Aakash Das. All rights reserved.',
    customNote: 'Personal archive, educational resources, and writing.',
  },
  seo: {
    title: 'Aakash Das',
    description:
      'Personal website of Aakash Das. Studying Information Technology at Softwarica College and building RisePaisa. Exploring technology, finance, productivity, and digital products.',
    canonicalUrl: 'https://aakashdas.live',
    ogTitle: 'Aakash Das',
    ogDescription: 'Personal archive, educational resources, and writing by Aakash Das.',
    ogImage: '/images/aakash-das.webp',
    keywords: [
      'Aakash Das',
      'RisePaisa',
      'Nepal Finance',
      'Information Technology',
      'Education',
    ],
    noIndex: false,
  },
  favicon: '/favicon.svg',
};

function mergeLoadedSettings(live: Partial<SiteSettingsDocument> | null): SiteSettingsDocument {
  if (!live) return DEFAULT_SETTINGS;
  return {
    ...DEFAULT_SETTINGS,
    ...live,
    profileImage: sanitizeAssetUrl(live.profileImage, DEFAULT_SETTINGS.profileImage),
    favicon: live.favicon || DEFAULT_SETTINGS.favicon,
    footer: { ...DEFAULT_SETTINGS.footer, ...(live.footer || {}) },
    seo: {
      ...DEFAULT_SETTINGS.seo,
      ...(live.seo || {}),
      canonicalUrl: live.seo?.canonicalUrl || DEFAULT_SETTINGS.seo.canonicalUrl,
    },
    navItems:
      live.navItems && live.navItems.length > 0 ? live.navItems : DEFAULT_SETTINGS.navItems,
    socialLinks:
      live.socialLinks && live.socialLinks.length > 0
        ? live.socialLinks
        : DEFAULT_SETTINGS.socialLinks,
  };
}

export const WebsiteSettingsEditor: React.FC<WebsiteSettingsEditorProps> = ({
  isDevPreview = false,
}) => {
  const [formData, setFormData] = useState<SiteSettingsDocument>(DEFAULT_SETTINGS);
  const [initialData, setInitialData] = useState<SiteSettingsDocument>(DEFAULT_SETTINGS);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Add social link state
  const [newSocialPlatform, setNewSocialPlatform] = useState('YouTube');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [socialError, setSocialError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (isDevPreview && typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const merged = mergeLoadedSettings(JSON.parse(cached));
            if (isMounted) {
              setFormData(merged);
              setInitialData(merged);
              return;
            }
          } catch {
            // Fall through to defaults/live
          }
        }
      }

      try {
        const live = await getSiteSettings();
        if (isMounted && live) {
          const merged = mergeLoadedSettings(live);
          setFormData(merged);
          setInitialData(merged);
        }
      } catch (err) {
        console.warn('[WebsiteSettingsEditor] Using default settings baseline:', err);
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isDevPreview]);

  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  const updateField = <K extends keyof SiteSettingsDocument>(
    field: K,
    val: SiteSettingsDocument[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleUpdateSocialUrl = (index: number, url: string) => {
    const list = [...formData.socialLinks];
    list[index] = { ...list[index], url };
    updateField('socialLinks', list);
  };

  const handleRemoveSocial = (index: number) => {
    const list = formData.socialLinks
      .filter((_, i) => i !== index)
      .map((item, idx) => ({ ...item, order: idx + 1 }));
    updateField('socialLinks', list);
  };

  const handleAddSocial = () => {
    setSocialError(null);
    const url = newSocialUrl.trim();
    if (!url) {
      setSocialError('Please enter a profile URL.');
      return;
    }

    try {
      const parsed = new URL(url);
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        setSocialError('URL must start with https:// or http://');
        return;
      }
    } catch {
      setSocialError('Enter a valid URL (e.g. https://youtube.com/@username).');
      return;
    }

    const platformMeta =
      PLATFORM_OPTIONS.find((p) => p.platform === newSocialPlatform) || PLATFORM_OPTIONS[0];

    const newItem: CmsSocialLink = {
      id: `social-${Date.now()}`,
      order: formData.socialLinks.length + 1,
      visible: true,
      platform: newSocialPlatform,
      label: newSocialPlatform === 'X (Twitter)' ? 'X' : newSocialPlatform,
      handle: initialData.identity || '',
      url,
      icon: platformMeta.icon,
      featured: true,
    };

    updateField('socialLinks', [...formData.socialLinks, newItem]);
    setNewSocialUrl('');
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    // Preserve existing internal metadata and protect against accidental blank overwrites
    const payload: SiteSettingsDocument = {
      ...initialData,
      ...formData,
      websiteTitle: formData.websiteTitle.trim(),
      fullName: formData.fullName.trim(),
      displayName: formData.displayName.trim(),
      tagline: formData.tagline.trim() || initialData.tagline,
      shortDescription: formData.shortDescription.trim() || initialData.shortDescription,
      profileImage: sanitizeAssetUrl(
        formData.profileImage,
        initialData.profileImage || DEFAULT_SETTINGS.profileImage
      ),
      favicon: formData.favicon.trim() || initialData.favicon || DEFAULT_SETTINGS.favicon,
      email: formData.email.trim(),
      // Hidden internal fields preserved intact from loaded Firestore/initial settings
      positioning: initialData.positioning,
      identity: initialData.identity,
      location: initialData.location,
      phone: initialData.phone,
      whatsappNumber: initialData.whatsappNumber,
      navItems: initialData.navItems,
      footer: initialData.footer,
      seo: {
        ...initialData.seo,
        canonicalUrl: initialData.seo?.canonicalUrl || 'https://aakashdas.live',
      },
    };

    try {
      validateSiteSettings(payload);
    } catch (err) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus({ type: 'error', message: `Validation error: ${msg}` });
      return;
    }

    if (isDevPreview) {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }
      setFormData(payload);
      setInitialData(payload);
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: 'Website settings saved to local preview state.',
      });
      return;
    }

    try {
      const saved = await saveSiteSettings(payload);
      setFormData(saved);
      setInitialData(saved);
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: 'Website settings saved to Cloud Firestore.',
      });
    } catch (err) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus({
        type: 'error',
        message: `Failed to save settings: ${msg}`,
      });
    }
  };

  const handleReset = () => {
    setFormData(initialData);
    setSocialError(null);
    setSaveStatus(null);
  };

  return (
    <div className="space-y-6 max-w-3xl pb-10">
      {/* Header & Save */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold tracking-tight text-foreground m-0">
            Website Settings
          </h1>
          {isDirty && (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
              Unsaved changes
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {isDirty && (
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 min-h-[38px] sm:min-h-0 text-xs font-medium rounded-lg border border-border bg-card hover:bg-secondary text-foreground cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 min-h-[38px] sm:min-h-0 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 cursor-pointer whitespace-nowrap"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Save Status Feedback */}
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

      {/* Section 1: Website Identity */}
      <section className="p-5 rounded-xl border border-border bg-card space-y-4">
        <h2 className="text-sm font-semibold text-foreground m-0">Website Identity</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="settings-website-title" className="text-xs font-medium text-foreground block">
              Website Title
            </label>
            <input
              id="settings-website-title"
              type="text"
              value={formData.websiteTitle}
              onChange={(e) => updateField('websiteTitle', e.target.value)}
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-full-name" className="text-xs font-medium text-foreground block">
              Author / Full Name
            </label>
            <input
              id="settings-full-name"
              type="text"
              value={formData.fullName}
              onChange={(e) => updateField('fullName', e.target.value)}
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-display-name" className="text-xs font-medium text-foreground block">
              Short Display Name
            </label>
            <input
              id="settings-display-name"
              type="text"
              value={formData.displayName}
              onChange={(e) => updateField('displayName', e.target.value)}
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-tagline" className="text-xs font-medium text-foreground block">
              Tagline / Professional Headline
            </label>
            <input
              id="settings-tagline"
              type="text"
              value={formData.tagline}
              onChange={(e) => updateField('tagline', e.target.value)}
              className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="settings-description" className="text-xs font-medium text-foreground block">
              Global Website Description
            </label>
            <textarea
              id="settings-description"
              rows={3}
              value={formData.shortDescription}
              onChange={(e) => updateField('shortDescription', e.target.value)}
              className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20 resize-y"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-profile-image" className="text-xs font-medium text-foreground block">
              Default Profile Image
            </label>
            <input
              id="settings-profile-image"
              type="text"
              value={formData.profileImage}
              onChange={(e) => updateField('profileImage', e.target.value)}
              placeholder="/images/aakash-das.webp"
              className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="settings-favicon" className="text-xs font-medium text-foreground block">
              Favicon
            </label>
            <input
              id="settings-favicon"
              type="text"
              value={formData.favicon}
              onChange={(e) => updateField('favicon', e.target.value)}
              placeholder="/favicon.svg"
              className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Contact & Social Links */}
      <section className="p-5 rounded-xl border border-border bg-card space-y-5">
        <h2 className="text-sm font-semibold text-foreground m-0">Contact & Social Links</h2>

        <div className="space-y-1.5">
          <label htmlFor="settings-email" className="text-xs font-medium text-foreground block">
            Email Address
          </label>
          <input
            id="settings-email"
            type="email"
            value={formData.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="contact@aakashdas.live"
            className="w-full sm:max-w-sm text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="space-y-3 pt-2 border-t border-border/60">
          <span className="text-xs font-medium text-foreground block">
            Social Media Profile URLs
          </span>

          <div className="space-y-2">
            {formData.socialLinks.map((link, index) => (
              <div
                key={link.id || index}
                className="flex flex-col sm:flex-row sm:items-center gap-2"
              >
                <span className="text-xs font-medium text-muted-foreground sm:w-28 shrink-0">
                  {link.platform}
                </span>
                <input
                  type="url"
                  value={link.url}
                  aria-label={`${link.platform} URL`}
                  onChange={(e) => handleUpdateSocialUrl(index, e.target.value)}
                  className="flex-1 text-xs font-mono rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSocial(index)}
                  aria-label={`Remove ${link.platform}`}
                  className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-md border border-border bg-background hover:bg-destructive/10 hover:text-destructive text-muted-foreground text-xs cursor-pointer self-start sm:self-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Inline Add Social Link */}
          <div className="pt-2 space-y-2">
            {socialError && (
              <p className="text-xs text-destructive m-0">{socialError}</p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={newSocialPlatform}
                aria-label="Social platform"
                onChange={(e) => setNewSocialPlatform(e.target.value)}
                className="sm:w-36 text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                {PLATFORM_OPTIONS.map((opt) => (
                  <option key={opt.platform} value={opt.platform}>
                    {opt.platform}
                  </option>
                ))}
              </select>
              <input
                type="url"
                value={newSocialUrl}
                onChange={(e) => setNewSocialUrl(e.target.value)}
                placeholder="https://..."
                aria-label="New social profile URL"
                className="flex-1 text-xs font-mono rounded-lg border border-input bg-background px-3 py-1.5 text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={handleAddSocial}
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-secondary text-foreground shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Link</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
