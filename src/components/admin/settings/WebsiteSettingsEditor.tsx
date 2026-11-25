import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  User,
  Phone,
  Share2,
  Menu,
  Search,
  Eye,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  ExternalLink,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type {
  SiteSettingsDocument,
  CmsSocialLink,
  CmsNavItem,
  CmsFooterConfig,
  SocialPlatformIcon,
} from '../../../types/cms/siteSettings.ts';
import type { SeoMetadata } from '../../../types/cms/common.ts';
import { getSiteSettings, saveSiteSettings } from '../../../lib/cms/siteSettings.repository.ts';
import { validateSiteSettings } from '../../../lib/cms/validation.ts';
import { sanitizeAssetUrl } from '../../../lib/cms/sanitize.ts';
import { ImagePreview, ImageUploader, type ImageMetaInfo } from '../media/index.ts';

type SettingsSubTab = 'identity' | 'contact' | 'social' | 'nav-footer' | 'seo' | 'preview';

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
    ogDescription:
      'Personal archive, educational resources, and writing by Aakash Das.',
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

export const WebsiteSettingsEditor: React.FC<WebsiteSettingsEditorProps> = ({
  isDevPreview = false,
}) => {
  const [subTab, setSubTab] = useState<SettingsSubTab>('identity');
  const [formData, setFormData] = useState<SiteSettingsDocument>(DEFAULT_SETTINGS);
  const [initialData, setInitialData] = useState<SiteSettingsDocument>(DEFAULT_SETTINGS);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // New social link input state
  const [newSocialPlatform, setNewSocialPlatform] = useState('YouTube');
  const [newSocialLabel, setNewSocialLabel] = useState('');
  const [newSocialHandle, setNewSocialHandle] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');
  const [socialError, setSocialError] = useState<string | null>(null);

  // New nav item input state
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavHref, setNewNavHref] = useState('');
  const [newNavBadge, setNewNavBadge] = useState('');
  const [navError, setNavError] = useState<string | null>(null);

  // Keywords string state
  const [keywordsInput, setKeywordsInput] = useState('');

  // Load site settings on mount
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      // In Dev Preview, try reading from sessionStorage
      if (isDevPreview && typeof window !== 'undefined') {
        const cached = sessionStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (isMounted) {
              setFormData(parsed);
              setInitialData(parsed);
              setKeywordsInput((parsed.seo?.keywords || []).join(', '));
              return;
            }
          } catch {
            // Ignore parse errors and fallback
          }
        }
      }

      // Try loading from live Firestore
      try {
        const live = await getSiteSettings();
        if (isMounted && live) {
          const merged: SiteSettingsDocument = {
            ...DEFAULT_SETTINGS,
            ...live,
            profileImage: sanitizeAssetUrl(live.profileImage, DEFAULT_SETTINGS.profileImage),
            footer: { ...DEFAULT_SETTINGS.footer, ...(live.footer || {}) },
            seo: { ...DEFAULT_SETTINGS.seo, ...(live.seo || {}) },
            navItems:
              live.navItems && live.navItems.length > 0
                ? live.navItems
                : DEFAULT_SETTINGS.navItems,
            socialLinks:
              live.socialLinks && live.socialLinks.length > 0
                ? live.socialLinks
                : DEFAULT_SETTINGS.socialLinks,
          };
          setFormData(merged);
          setInitialData(merged);
          setKeywordsInput((merged.seo?.keywords || []).join(', '));
        } else if (isMounted) {
          setKeywordsInput((DEFAULT_SETTINGS.seo.keywords || []).join(', '));
        }
      } catch (err) {
        console.warn('[WebsiteSettingsEditor] Loaded default static baseline:', err);
        if (isMounted) {
          setKeywordsInput((DEFAULT_SETTINGS.seo.keywords || []).join(', '));
        }
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [isDevPreview]);

  // Dirty state tracking
  const isDirty = JSON.stringify(formData) !== JSON.stringify(initialData);

  // Update handlers
  const updateField = <K extends keyof SiteSettingsDocument>(
    field: K,
    val: SiteSettingsDocument[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const updateFooter = <K extends keyof CmsFooterConfig>(
    field: K,
    val: CmsFooterConfig[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      footer: { ...prev.footer, [field]: val },
    }));
  };

  const updateSeo = <K extends keyof SeoMetadata>(field: K, val: SeoMetadata[K]) => {
    setFormData((prev) => ({
      ...prev,
      seo: { ...prev.seo, [field]: val },
    }));
  };

  // Social link helpers
  const handleUpdateSocial = (index: number, field: keyof CmsSocialLink, val: any) => {
    const list = [...formData.socialLinks];
    list[index] = { ...list[index], [field]: val };
    updateField('socialLinks', list);
  };

  const handleToggleSocialVisibility = (index: number) => {
    const list = [...formData.socialLinks];
    list[index] = { ...list[index], visible: !list[index].visible };
    updateField('socialLinks', list);
  };

  const handleMoveSocial = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formData.socialLinks.length) return;
    const list = [...formData.socialLinks];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    list.forEach((item, idx) => (item.order = idx + 1));
    updateField('socialLinks', list);
  };

  const handleRemoveSocial = (index: number) => {
    const list = formData.socialLinks.filter((_, i) => i !== index);
    list.forEach((item, idx) => (item.order = idx + 1));
    updateField('socialLinks', list);
  };

  const handleAddSocial = () => {
    setSocialError(null);
    if (!newSocialUrl.trim()) {
      setSocialError('Profile URL cannot be empty.');
      return;
    }

    try {
      const parsed = new URL(newSocialUrl.trim());
      if (!['https:', 'http:'].includes(parsed.protocol)) {
        setSocialError('URL must begin with https:// or http://');
        return;
      }
    } catch {
      setSocialError('Please enter a valid URL (e.g. https://youtube.com/@username)');
      return;
    }

    const platformMeta =
      PLATFORM_OPTIONS.find((p) => p.platform === newSocialPlatform) || PLATFORM_OPTIONS[0];

    const newItem: CmsSocialLink = {
      id: `social-${Date.now()}`,
      order: formData.socialLinks.length + 1,
      visible: true,
      platform: newSocialPlatform,
      label: newSocialLabel.trim() || newSocialPlatform,
      handle: newSocialHandle.trim() || '@me.aakashdas',
      url: newSocialUrl.trim(),
      icon: platformMeta.icon,
      featured: true,
    };

    updateField('socialLinks', [...formData.socialLinks, newItem]);
    setNewSocialLabel('');
    setNewSocialHandle('');
    setNewSocialUrl('');
  };

  // Nav item helpers
  const handleUpdateNav = (index: number, field: keyof CmsNavItem, val: any) => {
    const list = [...formData.navItems];
    list[index] = { ...list[index], [field]: val };
    updateField('navItems', list);
  };

  const handleToggleNavVisibility = (index: number) => {
    const list = [...formData.navItems];
    list[index] = { ...list[index], visible: !list[index].visible };
    updateField('navItems', list);
  };

  const handleMoveNav = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= formData.navItems.length) return;
    const list = [...formData.navItems];
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    list.forEach((item, idx) => (item.order = idx + 1));
    updateField('navItems', list);
  };

  const handleRemoveNav = (index: number) => {
    const list = formData.navItems.filter((_, i) => i !== index);
    list.forEach((item, idx) => (item.order = idx + 1));
    updateField('navItems', list);
  };

  const handleAddNav = () => {
    setNavError(null);
    if (!newNavLabel.trim() || !newNavHref.trim()) {
      setNavError('Navigation label and target href are required.');
      return;
    }

    const newItem: CmsNavItem = {
      id: `nav-${Date.now()}`,
      order: formData.navItems.length + 1,
      visible: true,
      label: newNavLabel.trim(),
      href: newNavHref.trim(),
    };
    if (newNavBadge.trim()) {
      newItem.badge = newNavBadge.trim();
    }

    updateField('navItems', [...formData.navItems, newItem]);
    setNewNavLabel('');
    setNewNavHref('');
    setNewNavBadge('');
  };

  // Keywords update helper
  const handleKeywordsChange = (val: string) => {
    setKeywordsInput(val);
    const parsed = val
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    updateSeo('keywords', parsed);
  };

  // Save handler
  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);

    // Validate schema
    try {
      validateSiteSettings(formData);
    } catch (err) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus({
        type: 'error',
        message: `Validation Error: ${msg}`,
      });
      return;
    }

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
            'Website settings saved to local preview state. (Live Firestore write disabled in Dev Preview)',
        });
      }, 350);
      return;
    }

    try {
      await saveSiteSettings(formData);
      setInitialData(formData);
      setIsSaving(false);
      setSaveStatus({
        type: 'success',
        message: 'Website settings successfully published to Cloud Firestore.',
      });
    } catch (err) {
      setIsSaving(false);
      const msg = err instanceof Error ? err.message : String(err);
      setSaveStatus({
        type: 'error',
        message: `Failed to save website settings: ${msg}`,
      });
    }
  };

  const handleReset = () => {
    if (confirm('Discard all unsaved changes to website settings?')) {
      setFormData(initialData);
      setKeywordsInput((initialData.seo?.keywords || []).join(', '));
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
              Website Settings CMS
            </h1>
            {isDirty && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                Unsaved changes
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 m-0">
            Configure global website identity, domain defaults, contact channels, header navigation, and SEO metadata.
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
                <span>Saving settings...</span>
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
          <span>Identity & Domain</span>
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
            {formData.socialLinks.filter((s) => s.visible !== false).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('nav-footer')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'nav-footer'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Menu className="w-3.5 h-3.5" />
          <span>Navigation & Footer</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-background border border-border">
            {formData.navItems.filter((n) => n.visible !== false).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('seo')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
            subTab === 'seo'
              ? 'bg-secondary text-foreground font-semibold shadow-2xs'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Global SEO</span>
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
        {/* Sub-tab 1: Identity & Domain */}
        {subTab === 'identity' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground m-0">
                Website Identity & Canonical Domain
              </h3>
              <p className="text-xs text-muted-foreground m-0">
                Configure primary website branding, production canonical URL, and personal positioning.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Website Title
                </label>
                <input
                  type="text"
                  value={formData.websiteTitle}
                  onChange={(e) => updateField('websiteTitle', e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Author / Full Name
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Short Display Name
                </label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => updateField('displayName', e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Canonical Production Domain
                </label>
                <input
                  type="url"
                  value={formData.seo?.canonicalUrl || 'https://aakashdas.live'}
                  onChange={(e) => updateSeo('canonicalUrl', e.target.value)}
                  placeholder="https://aakashdas.live"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground block font-mono">
                  Production URL: https://aakashdas.live
                </span>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Tagline / Professional Headline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => updateField('tagline', e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Positioning Statement
                </label>
                <input
                  type="text"
                  value={formData.positioning}
                  onChange={(e) => updateField('positioning', e.target.value)}
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Global Website Description
                </label>
                <textarea
                  rows={3}
                  value={formData.shortDescription}
                  onChange={(e) => updateField('shortDescription', e.target.value)}
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
                  onChange={(e) => updateField('identity', e.target.value)}
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
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Kathmandu, Nepal"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Favicon Reference
                </label>
                <input
                  type="text"
                  value={formData.favicon}
                  onChange={(e) => updateField('favicon', e.target.value)}
                  placeholder="/favicon.svg"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Default Profile Image
                </label>
                <input
                  type="text"
                  value={formData.profileImage}
                  onChange={(e) => updateField('profileImage', e.target.value)}
                  placeholder="/images/aakash-das.webp"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 2: Contact Channels */}
        {subTab === 'contact' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground m-0">
                Direct Contact Channels
              </h3>
              <p className="text-xs text-muted-foreground m-0">
                Configure primary email, phone, and WhatsApp contact channels displayed across the website header and footer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Primary Contact Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="contact@aakashdas.live"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Displayed in Say Hello button and footer mailto link.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  WhatsApp Contact Number
                </label>
                <input
                  type="text"
                  value={formData.whatsappNumber}
                  onChange={(e) => updateField('whatsappNumber', e.target.value)}
                  placeholder="977XXXXXXXXXX"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground block">
                  International format without + prefix (e.g. 97798XXXXXXXX).
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="+977-XXXXXXXXXX"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground block">
                  Used for Call me action in footer.
                </span>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  Geographic Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  placeholder="Kathmandu, Nepal"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 3: Social Media Links */}
        {subTab === 'social' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground m-0">
                Social Media Profiles & Channels
              </h3>
              <p className="text-xs text-muted-foreground m-0">
                Manage all social profile links rendered in the website footer and the About page contact section.
              </p>
            </div>

            {/* List */}
            <div className="space-y-3">
              {formData.socialLinks.map((link, index) => (
                <div
                  key={link.id || index}
                  className={`rounded-xl border p-4 space-y-3 transition-all ${
                    link.visible !== false
                      ? 'bg-card border-border shadow-2xs'
                      : 'bg-secondary/30 border-border/60 opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground">
                        {link.platform}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {link.handle}
                      </span>
                      {link.visible === false && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
                          Hidden
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title={link.visible !== false ? 'Hide on website' : 'Show on website'}
                        onClick={() => handleToggleSocialVisibility(index)}
                        className={`w-7 h-7 inline-flex items-center justify-center rounded-md border text-xs transition-colors cursor-pointer ${
                          link.visible !== false
                            ? 'border-border bg-background hover:bg-secondary text-foreground'
                            : 'border-border/60 bg-secondary text-muted-foreground'
                        }`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Move link up"
                        disabled={index === 0}
                        onClick={() => handleMoveSocial(index, 'up')}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Move link down"
                        disabled={index === formData.socialLinks.length - 1}
                        onClick={() => handleMoveSocial(index, 'down')}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Delete social link"
                        onClick={() => handleRemoveSocial(index)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Label
                      </label>
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => handleUpdateSocial(index, 'label', e.target.value)}
                        className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Handle
                      </label>
                      <input
                        type="text"
                        value={link.handle}
                        onChange={(e) => handleUpdateSocial(index, 'handle', e.target.value)}
                        className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                        Target URL
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => handleUpdateSocial(index, 'url', e.target.value)}
                          className="flex-1 text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Channel */}
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 space-y-3">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-primary" />
                <span>Add Social Channel</span>
              </label>

              {socialError && (
                <div className="text-xs text-destructive flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{socialError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    Platform
                  </label>
                  <select
                    value={newSocialPlatform}
                    onChange={(e) => {
                      setNewSocialPlatform(e.target.value);
                      const opt = PLATFORM_OPTIONS.find((p) => p.platform === e.target.value);
                      if (opt && !newSocialUrl) {
                        setNewSocialUrl(opt.defaultDomain);
                      }
                    }}
                    className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.platform} value={opt.platform}>
                        {opt.platform}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    placeholder={newSocialPlatform}
                    value={newSocialLabel}
                    onChange={(e) => setNewSocialLabel(e.target.value)}
                    className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    Handle
                  </label>
                  <input
                    type="text"
                    placeholder="@me.aakashdas"
                    value={newSocialHandle}
                    onChange={(e) => setNewSocialHandle(e.target.value)}
                    className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                    URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={newSocialUrl}
                    onChange={(e) => setNewSocialUrl(e.target.value)}
                    className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleAddSocial}
                  className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Social Link</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 4: Navigation & Footer */}
        {subTab === 'nav-footer' && (
          <div className="space-y-8">
            {/* Header Navigation Items */}
            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground m-0">
                  Header Navigation Items
                </h3>
                <p className="text-xs text-muted-foreground m-0">
                  Control the primary links that appear in the top website navbar.
                </p>
              </div>

              <div className="space-y-2.5">
                {formData.navItems.map((item, index) => (
                  <div
                    key={item.id || index}
                    className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 flex-wrap ${
                      item.visible !== false
                        ? 'bg-card border-border shadow-2xs'
                        : 'bg-secondary/30 border-border/60 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                      <span className="w-6 h-6 rounded-md bg-secondary text-foreground text-xs font-mono font-medium flex items-center justify-center shrink-0">
                        {item.order || index + 1}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => handleUpdateNav(index, 'label', e.target.value)}
                          placeholder="Label (e.g. Resources)"
                          className="text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                        <input
                          type="text"
                          value={item.href}
                          onChange={(e) => handleUpdateNav(index, 'href', e.target.value)}
                          placeholder="Path (e.g. /resources)"
                          className="text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title={item.visible !== false ? 'Hide item' : 'Show item'}
                        onClick={() => handleToggleNavVisibility(index)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Move item up"
                        disabled={index === 0}
                        onClick={() => handleMoveNav(index, 'up')}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Move item down"
                        disabled={index === formData.navItems.length - 1}
                        onClick={() => handleMoveNav(index, 'down')}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-border bg-background hover:bg-secondary text-foreground disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        title="Delete nav item"
                        onClick={() => handleRemoveNav(index)}
                        className="w-7 h-7 inline-flex items-center justify-center rounded-md border border-destructive/20 bg-destructive/5 text-destructive hover:bg-destructive/15 transition-colors cursor-pointer ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Nav Item */}
              <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 space-y-3">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                  <span>Add Navigation Link</span>
                </label>

                {navError && (
                  <div className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{navError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                      Label
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Writing"
                      value={newNavLabel}
                      onChange={(e) => setNewNavLabel(e.target.value)}
                      className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                      Href / Target Path
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. /journal"
                      value={newNavHref}
                      onChange={(e) => setNewNavHref(e.target.value)}
                      className="w-full text-xs font-mono rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono text-muted-foreground mb-1">
                      Badge (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. New"
                      value={newNavBadge}
                      onChange={(e) => setNewNavBadge(e.target.value)}
                      className="w-full text-xs rounded-lg border border-input bg-background px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddNav}
                    className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Navigation Item</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Configuration */}
            <div className="space-y-4 pt-6 border-t border-border/80">
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground m-0">
                  Footer Configuration
                </h3>
                <p className="text-xs text-muted-foreground m-0">
                  Control which components and sections render inside the global website footer.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.footer?.showNav !== false}
                    onChange={(e) => updateFooter('showNav', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Show Footer Navigation
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Display page links in the footer left column
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.footer?.showSocial !== false}
                    onChange={(e) => updateFooter('showSocial', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Show Social Links
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Display social platform tags with outbound arrows
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.footer?.showContact !== false}
                    onChange={(e) => updateFooter('showContact', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Show Email Channel
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Render email address mailto action in footer
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.footer?.showDirectActions !== false}
                    onChange={(e) => updateFooter('showDirectActions', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Show Direct Actions (Call & WhatsApp)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Display direct contact action pills in footer
                    </span>
                  </div>
                </label>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground block">
                    Copyright Notice
                  </label>
                  <input
                    type="text"
                    value={formData.footer?.copyrightText || ''}
                    onChange={(e) => updateFooter('copyrightText', e.target.value)}
                    placeholder="© 2025 Aakash Das. All rights reserved."
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-medium text-foreground block">
                    Custom Editorial Note (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.footer?.customNote || ''}
                    onChange={(e) => updateFooter('customNote', e.target.value)}
                    placeholder="Personal archive, educational resources, and writing."
                    className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 5: Global SEO */}
        {subTab === 'seo' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground m-0">
                Global SEO & Social Graph Metadata
              </h3>
              <p className="text-xs text-muted-foreground m-0">
                Configure search engine title, meta description, OpenGraph share preview, and robots indexing flags.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Default Global Title
                </label>
                <input
                  type="text"
                  value={formData.seo?.title || ''}
                  onChange={(e) => updateSeo('title', e.target.value)}
                  placeholder="Aakash Das"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Default Meta Description
                </label>
                <textarea
                  rows={3}
                  value={formData.seo?.description || ''}
                  onChange={(e) => updateSeo('description', e.target.value)}
                  placeholder="Personal website of Aakash Das..."
                  className="w-full text-xs leading-relaxed rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-y"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  OpenGraph Title
                </label>
                <input
                  type="text"
                  value={formData.seo?.ogTitle || ''}
                  onChange={(e) => updateSeo('ogTitle', e.target.value)}
                  placeholder="Aakash Das"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground block">
                  OpenGraph Share Image URL
                </label>
                <input
                  type="text"
                  value={formData.seo?.ogImage || ''}
                  onChange={(e) => updateSeo('ogImage', e.target.value)}
                  placeholder="/images/aakash-das.webp"
                  className="w-full text-xs font-mono rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  OpenGraph Description
                </label>
                <input
                  type="text"
                  value={formData.seo?.ogDescription || ''}
                  onChange={(e) => updateSeo('ogDescription', e.target.value)}
                  placeholder="Personal archive, educational resources, and writing by Aakash Das."
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground block">
                  Keywords (Comma separated)
                </label>
                <input
                  type="text"
                  value={keywordsInput}
                  onChange={(e) => handleKeywordsChange(e.target.value)}
                  placeholder="Aakash Das, RisePaisa, Nepal Finance, Technology"
                  className="w-full text-xs rounded-lg border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="space-y-2 sm:col-span-2 pt-2">
                <label className="flex items-center gap-3 p-3.5 rounded-xl border border-border bg-card cursor-pointer hover:bg-secondary/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.seo?.noIndex === true}
                    onChange={(e) => updateSeo('noIndex', e.target.checked)}
                    className="w-4 h-4 rounded text-primary focus:ring-primary"
                  />
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Block Search Engines (noindex)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Enable only during maintenance. Live production should keep this unchecked.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Sub-tab 6: Live Preview */}
        {subTab === 'preview' && (
          <div className="space-y-8">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-foreground m-0">
                Real-Time Website Configuration Preview
              </h3>
              <p className="text-xs text-muted-foreground m-0">
                Interactive representation of how these settings appear in the header navigation, search engine results, and footer.
              </p>
            </div>

            {/* 1. Header Mockup */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Header Bar Preview
              </span>
              <div className="border border-border/80 rounded-lg p-3 bg-background flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <span className="font-semibold text-sm tracking-tight text-foreground">
                    {formData.websiteTitle || formData.fullName}
                  </span>
                  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
                    {formData.navItems
                      .filter((n) => n.visible !== false)
                      .map((n) => (
                        <span key={n.id} className="hover:text-foreground">
                          {n.label}
                        </span>
                      ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2.5 py-1 rounded border border-border bg-secondary text-foreground">
                    Say hello
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Google Search Result Snippet */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Google Search Result Snippet Preview
              </span>
              <div className="border border-border/80 rounded-lg p-4 bg-background space-y-1 max-w-xl">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono text-[11px]">
                    {formData.seo?.canonicalUrl || 'https://aakashdas.live'}
                  </span>
                </div>
                <h4 className="text-base text-blue-600 dark:text-blue-400 font-medium hover:underline cursor-pointer m-0">
                  {formData.seo?.title || formData.websiteTitle || 'Aakash Das'}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed m-0">
                  {formData.seo?.description || formData.shortDescription}
                </p>
              </div>
            </div>

            {/* 3. Footer Mockup */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-2xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
                Footer Mockup Preview
              </span>
              <div className="border border-border/80 rounded-lg p-4 bg-background flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1.5">
                  {formData.footer?.showNav !== false && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {formData.navItems
                        .filter((n) => n.visible !== false)
                        .map((n) => (
                          <span key={n.id}>{n.label}</span>
                        ))}
                    </div>
                  )}
                  {formData.footer?.showSocial !== false && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      {formData.socialLinks
                        .filter((s) => s.visible !== false)
                        .slice(0, 4)
                        .map((s) => (
                          <span key={s.id} className="font-mono text-[11px]">
                            {s.platform}
                          </span>
                        ))}
                    </div>
                  )}
                </div>

                <div className="text-right space-y-1">
                  {formData.footer?.showContact !== false && (
                    <span className="text-xs font-mono text-muted-foreground block">
                      {formData.email}
                    </span>
                  )}
                  {formData.footer?.showDirectActions !== false && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-0.5 rounded border border-border text-[11px]">
                        Call me
                      </span>
                      <span className="px-2 py-0.5 rounded border border-border text-[11px]">
                        WhatsApp
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
