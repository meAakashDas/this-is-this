import type { CmsDocumentMeta, SeoMetadata, ReorderableItem } from './common.ts';

export interface CmsCtaLink {
  text: string;
  url: string;
  visible: boolean;
  isExternal?: boolean;
}

export interface HomePageDocument extends CmsDocumentMeta {
  // Hero Zone
  heroHeadline: string;
  heroRolePrefix: string;
  heroRoleBrand: string;
  heroRoleUrl: string;
  heroTagline: string;
  heroPhotoUrl: string;
  heroPhotoAlt: string;
  primaryCta: CmsCtaLink;
  secondaryCta: CmsCtaLink;

  // Section Configurations
  sections: {
    hero?: {
      visible: boolean;
      order?: number;
    };
    finder: {
      visible: boolean;
      heading: string;
      placeholder: string;
      buttonLabel: string;
      order?: number;
    };
    featuredResources: {
      visible: boolean;
      heading: string;
      count: number;
      customResourceIds?: string[];
      order?: number;
    };
    journal: {
      visible: boolean;
      heading: string;
      description: string;
      ctaText: string;
      ctaUrl: string;
      order?: number;
    };
    contact: {
      visible: boolean;
      heading: string;
      description: string;
      showEmail: boolean;
      showSocial: boolean;
      order?: number;
    };
  };

  sectionOrder?: string[];
  seo: SeoMetadata;
}

export interface CmsWorkEntry extends ReorderableItem {
  index: string; // e.g. "01", "02"
  name: string;
  desc: string;
  link?: {
    text: string;
    url: string;
    isExternal: boolean;
  };
}

export interface CmsMediaEntry extends ReorderableItem {
  show: string;
  role: string;
  format: string; // e.g. "Featured Interview", "Podcast", "Panel"
  desc: string;
  url?: string;
  coverImage?: string;
}

export interface CmsEducationEntry extends ReorderableItem {
  index: string;
  title: string;
  degree?: string;
  institution?: string;
  period?: string;
  status?: string; // e.g. "Currently pursuing."
  desc?: string;
}

export interface CmsExperienceEntry extends ReorderableItem {
  organization: string;
  position: string;
  period?: string;
  desc?: string;
  status?: string;
}

export interface CmsStoryMilestone extends ReorderableItem {
  number: string;
  title: string;
  paragraph: string;
}

export interface AboutPageDocument extends CmsDocumentMeta {
  title: string;
  introParagraphs: string[];
  workEntries: CmsWorkEntry[];
  mediaEntries: CmsMediaEntry[];
  educationEntries: CmsEducationEntry[];
  experienceEntries: CmsExperienceEntry[];
  storyMilestones?: CmsStoryMilestone[];
  contact: {
    visible: boolean;
    showEmail: boolean;
    showSocial: boolean;
  };
  sectionOrder?: string[];
  sectionVisibility?: Record<string, boolean>;
  seo: SeoMetadata;
}
