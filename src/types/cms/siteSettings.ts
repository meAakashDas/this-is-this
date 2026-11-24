import type { CmsDocumentMeta, SeoMetadata, ReorderableItem } from './common.ts';

export type SocialPlatformIcon =
  | 'instagram'
  | 'youtube'
  | 'tiktok'
  | 'linkedin'
  | 'twitter'
  | 'facebook'
  | 'mail'
  | 'phone'
  | 'whatsapp'
  | 'link';

export interface CmsSocialLink extends ReorderableItem {
  platform: string;
  label: string;
  handle: string;
  url: string;
  icon: SocialPlatformIcon;
  featured: boolean;
}

export interface CmsNavItem extends ReorderableItem {
  label: string;
  href: string;
  badge?: string;
}

export interface CmsFooterConfig {
  showNav: boolean;
  showSocial: boolean;
  showContact: boolean;
  showDirectActions: boolean;
  customNote?: string;
  copyrightText?: string;
}

export interface SiteSettingsDocument extends CmsDocumentMeta {
  // Personal Identity
  fullName: string;
  displayName: string;
  websiteTitle: string;
  tagline: string;
  positioning: string;
  shortDescription: string;
  profileImage: string;
  email: string;
  phone: string;
  whatsappNumber: string;
  location: string;
  identity: string;

  // Social Links
  socialLinks: CmsSocialLink[];

  // Navigation & Footer
  navItems: CmsNavItem[];
  footer: CmsFooterConfig;

  // Global SEO & Branding
  seo: SeoMetadata;
  favicon: string;
}
