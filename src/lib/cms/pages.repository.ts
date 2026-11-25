import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore, tryGetFirebaseFirestore } from '../firebase/index.ts';
import { validateHomePage, validateAboutPage } from './validation.ts';
import { removeUndefinedFields } from './sanitize.ts';
import { CmsError } from './errors.ts';
import type { HomePageDocument, AboutPageDocument } from '../../types/cms/index.ts';

const COLLECTION = 'pages';

/**
 * Retrieves the editable homepage content document.
 */
export async function getHomePageContent(): Promise<HomePageDocument | null> {
  const db = tryGetFirebaseFirestore();
  if (!db) return null;

  try {
    const docRef = doc(db, COLLECTION, 'home');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    return snap.data() as HomePageDocument;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch homepage content: ${msg}`, 'READ_FAILED');
  }
}

/**
 * Saves or updates the homepage content document.
 */
export async function saveHomePageContent(
  data: Partial<HomePageDocument>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<HomePageDocument> {
  const db = getFirebaseFirestore();
  const existing = await getHomePageContent();
  const now = new Date().toISOString();

  const merged: HomePageDocument = {
    ...(existing || {
      id: 'home',
      createdAt: now,
      updatedAt: now,
      heroHeadline: "I'm Aakash Das.",
      heroRolePrefix: 'Founder of',
      heroRoleBrand: 'RisePaisa',
      heroRoleUrl: 'https://risepaisa.com',
      heroTagline: 'I love learning, building, and sharing.',
      heroPhotoUrl: '/images/aakash-das.webp',
      heroPhotoAlt: 'Aakash Das',
      primaryCta: {
        text: 'Explore free resources',
        url: '/resources',
        visible: true,
      },
      secondaryCta: {
        text: 'About me',
        url: '/about',
        visible: true,
      },
      sections: {
        hero: {
          visible: true,
        },
        finder: {
          visible: true,
          heading: 'Find Resources',
          placeholder: 'Enter resource number',
          buttonLabel: 'Find',
        },
        featuredResources: {
          visible: true,
          heading: 'Free Resources',
          count: 3,
          customResourceIds: ['001', '002', '003'],
        },
        journal: {
          visible: true,
          heading: 'Journal',
          description: 'Essays, research notes, and reflections on finance, technology, and building in Nepal.',
          ctaText: 'Read articles',
          ctaUrl: '/journal',
        },
        contact: {
          visible: true,
          heading: 'Get in Touch',
          description: 'Feel free to reach out directly via email or connect on social platforms.',
          showEmail: true,
          showSocial: true,
        },
      },
      seo: {},
    }),
    ...data,
    id: 'home',
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateHomePage(merged);

  try {
    const docRef = doc(db, COLLECTION, 'home');
    await setDoc(docRef, removeUndefinedFields(validated), { merge: true });
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to save homepage content: ${msg}`, 'WRITE_FAILED');
  }
}

export const DEFAULT_ABOUT_PAGE: AboutPageDocument = {
  id: 'about',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
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

/**
 * Retrieves the editable About page content document.
 */
export async function getAboutPageContent(): Promise<AboutPageDocument | null> {
  const db = tryGetFirebaseFirestore();
  if (!db) return null;

  try {
    const docRef = doc(db, COLLECTION, 'about');
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data() as AboutPageDocument;

    // Fall back empty arrays to baseline defaults so historical empty saves do not wipe UI
    if (!data.workEntries || data.workEntries.length === 0) {
      data.workEntries = DEFAULT_ABOUT_PAGE.workEntries;
    }
    if (!data.mediaEntries || data.mediaEntries.length === 0) {
      data.mediaEntries = DEFAULT_ABOUT_PAGE.mediaEntries;
    }
    if (!data.educationEntries || data.educationEntries.length === 0) {
      data.educationEntries = DEFAULT_ABOUT_PAGE.educationEntries;
    }
    if (!data.experienceEntries || data.experienceEntries.length === 0) {
      data.experienceEntries = DEFAULT_ABOUT_PAGE.experienceEntries;
    }

    return data;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch about page content: ${msg}`, 'READ_FAILED');
  }
}

/**
 * Saves or updates the About page content document.
 */
export async function saveAboutPageContent(
  data: Partial<AboutPageDocument>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<AboutPageDocument> {
  const db = getFirebaseFirestore();
  const existing = await getAboutPageContent();
  const now = new Date().toISOString();

  const merged: AboutPageDocument = {
    ...(existing || {
      ...DEFAULT_ABOUT_PAGE,
      createdAt: now,
      updatedAt: now,
    }),
    ...data,
    id: 'about',
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateAboutPage(merged);

  try {
    const docRef = doc(db, COLLECTION, 'about');
    await setDoc(docRef, removeUndefinedFields(validated), { merge: true });
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to save about page content: ${msg}`, 'WRITE_FAILED');
  }
}
