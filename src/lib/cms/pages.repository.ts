import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore, tryGetFirebaseFirestore } from '../firebase/index.ts';
import { validateHomePage, validateAboutPage } from './validation.ts';
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
    await setDoc(docRef, validated, { merge: true });
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to save homepage content: ${msg}`, 'WRITE_FAILED');
  }
}

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
    return snap.data() as AboutPageDocument;
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
      id: 'about',
      createdAt: now,
      updatedAt: now,
      title: 'About Aakash Das',
      introParagraphs: [],
      workEntries: [],
      mediaEntries: [],
      educationEntries: [],
      experienceEntries: [],
      contact: {
        visible: true,
        showEmail: true,
        showSocial: true,
      },
      seo: {},
    }),
    ...data,
    id: 'about',
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateAboutPage(merged);

  try {
    const docRef = doc(db, COLLECTION, 'about');
    await setDoc(docRef, validated, { merge: true });
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to save about page content: ${msg}`, 'WRITE_FAILED');
  }
}
