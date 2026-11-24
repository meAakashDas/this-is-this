import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseFirestore, tryGetFirebaseFirestore } from '../firebase/index.ts';
import { validateSiteSettings } from './validation.ts';
import { CmsError } from './errors.ts';
import type { SiteSettingsDocument } from '../../types/cms/index.ts';

const COLLECTION = 'siteSettings';
const DOCUMENT_ID = 'general';

/**
 * Retrieves the global site settings document.
 * Returns null if the document does not exist or if Firebase is unconfigured.
 */
export async function getSiteSettings(): Promise<SiteSettingsDocument | null> {
  const db = tryGetFirebaseFirestore();
  if (!db) return null;

  try {
    const docRef = doc(db, COLLECTION, DOCUMENT_ID);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as SiteSettingsDocument;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to fetch site settings: ${msg}`, 'READ_FAILED');
  }
}

/**
 * Updates or creates the global site settings document.
 * Enforces schema validation and updates timestamps.
 */
export async function saveSiteSettings(
  data: Partial<SiteSettingsDocument>,
  adminEmail: string = 'aakashdas.photo@gmail.com'
): Promise<SiteSettingsDocument> {
  const db = getFirebaseFirestore();
  const existing = await getSiteSettings();

  const now = new Date().toISOString();
  const merged: SiteSettingsDocument = {
    ...(existing || {
      id: DOCUMENT_ID,
      createdAt: now,
      updatedAt: now,
      fullName: 'Aakash Das',
      displayName: 'Aakash Das',
      websiteTitle: 'Aakash Das',
      tagline: 'Building, learning and sharing along the way.',
      positioning: 'Personal archive, educational resources, and writing by Aakash Das.',
      shortDescription: '',
      profileImage: '/images/aakash-das.webp',
      email: 'contact@aakashdas.live',
      phone: '+977-XXXXXXXXXX',
      whatsappNumber: '977XXXXXXXXXX',
      location: 'Kathmandu, Nepal',
      identity: 'me.aakashdas',
      socialLinks: [],
      navItems: [],
      footer: {
        showNav: true,
        showSocial: true,
        showContact: true,
        showDirectActions: true,
      },
      seo: {},
      favicon: '/favicon.svg',
    }),
    ...data,
    id: DOCUMENT_ID,
    updatedAt: now,
    updatedBy: adminEmail,
  };

  const validated = validateSiteSettings(merged);

  try {
    const docRef = doc(db, COLLECTION, DOCUMENT_ID);
    await setDoc(docRef, validated, { merge: true });
    return validated;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new CmsError(`Failed to save site settings: ${msg}`, 'WRITE_FAILED');
  }
}
