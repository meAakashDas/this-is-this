/**
 * Real-Time Client-Side Synchronization Engine for RisePaisa
 *
 * Ensures that changes made in the Admin Portal (create, edit, delete, unpublish)
 * are immediately reflected across public frontend routes without requiring a rebuild.
 *
 * Designed with caching to respect Firebase Spark plan limits (50,000 daily reads).
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
} from 'firebase/firestore';
import { getFirebaseConfig } from '../lib/firebase/config.ts';

const CACHE_KEY_RESOURCES = 'risepaisa_live_resources';
const CACHE_KEY_JOURNALS = 'risepaisa_live_journals';
const CACHE_KEY_TIME = 'risepaisa_live_timestamp';
const CACHE_TTL_MS = 60 * 1000; // 60-second cache TTL for high responsiveness & Spark safety

function initClientFirestore() {
  try {
    const config = getFirebaseConfig();
    const app = getApps().length > 0 ? getApp() : initializeApp(config);
    return getFirestore(app);
  } catch (err) {
    console.warn('[LiveSync] Firebase init skipped:', err);
    return null;
  }
}

function getCached<T>(key: string): T | null {
  try {
    const timeStr = sessionStorage.getItem(CACHE_KEY_TIME);
    if (!timeStr) return null;
    const time = parseInt(timeStr, 10);
    if (Date.now() - time > CACHE_TTL_MS) {
      return null;
    }
    const val = sessionStorage.getItem(key);
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}

function setCached(key: string, data: any) {
  try {
    sessionStorage.setItem(key, JSON.stringify(data));
    sessionStorage.setItem(CACHE_KEY_TIME, Date.now().toString());
  } catch {}
}

/**
 * 1. Synchronize the /resources Catalog Page
 */
async function syncResourcesCatalog(db: any) {
  const grid = document.querySelector('.resources-library-grid');
  if (!grid) return;

  let liveResources = getCached<any[]>(CACHE_KEY_RESOURCES);

  if (!liveResources) {
    try {
      const q = query(
        collection(db, 'resources'),
        where('published', '==', true),
        orderBy('resourceNumber', 'asc')
      );
      const snap = await getDocs(q);
      liveResources = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      setCached(CACHE_KEY_RESOURCES, liveResources);
    } catch (err) {
      console.warn('[LiveSync] Failed to query published resources:', err);
      return;
    }
  }

  if (!liveResources) return;

  const validNumbers = new Set(liveResources.map((r) => String(r.resourceNumber)));
  const existingCards = Array.from(grid.querySelectorAll<HTMLElement>('[data-resource-number]'));

  // 1. Remove cards that have been deleted or unpublished
  existingCards.forEach((card) => {
    const num = card.getAttribute('data-resource-number');
    if (num && !validNumbers.has(num)) {
      card.remove();
    }
  });

  // 2. Update existing cards with live data
  liveResources.forEach((res) => {
    const numStr = String(res.resourceNumber);
    const existingCard = grid.querySelector<HTMLElement>(`[data-resource-number="${numStr}"]`);

    if (existingCard) {
      const titleEl = existingCard.querySelector('.resource-title');
      const descEl = existingCard.querySelector('.resource-desc');
      if (titleEl && res.title && titleEl.textContent !== res.title) {
        titleEl.textContent = res.title;
      }
      if (descEl && res.description && descEl.textContent !== res.description) {
        descEl.textContent = res.description;
      }
    } else {
      // 3. Add newly created and published resources not yet in the static build
      const newCard = document.createElement('article');
      newCard.className =
        'resource-row-card group rounded-xl border border-border bg-card text-card-foreground shadow-xs hover:border-border-strong transition-all flex flex-col h-full p-5 sm:p-6';
      newCard.setAttribute('role', 'listitem');
      newCard.setAttribute('data-resource-number', numStr);
      newCard.innerHTML = `
        <a href="/resources/${numStr}" class="resource-card-link flex flex-col flex-1 no-underline text-inherit" aria-label="Open Resource ${numStr}: ${res.title}">
          <div class="resource-card-header flex items-center justify-between gap-2 mb-3 sm:mb-3.5">
            <span class="resource-num inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">
              NO. ${numStr}
            </span>
          </div>
          <div class="resource-card-body flex-1 flex flex-col mb-4">
            <h3 class="resource-title text-lg sm:text-[19px] font-semibold tracking-tight text-foreground group-hover:text-foreground transition-colors m-0 mb-2">
              ${res.title}
            </h3>
            <p class="resource-desc text-sm sm:text-[14.5px] text-muted-foreground leading-relaxed m-0 flex-1">
              ${res.description || ''}
            </p>
          </div>
          <div class="resource-card-footer flex items-center justify-end pt-3 mt-auto border-t border-border text-xs">
            <span class="resource-open-action inline-flex items-center gap-1 font-medium text-foreground group-hover:translate-x-0.5 transition-transform">
              <span>Open</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="open-arrow"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </span>
          </div>
        </a>
      `;
      grid.appendChild(newCard);
    }
  });

  // Check if grid is now empty
  const remaining = grid.querySelectorAll('[data-resource-number]');
  if (remaining.length === 0) {
    grid.innerHTML = `
      <div class="empty-resources-card rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm col-span-full">
        <p class="empty-resources-text m-0">No resources published yet.</p>
      </div>
    `;
  }
}

/**
 * 2. Synchronize the /resources/[id] Detail Page
 */
async function syncResourceDetail(db: any, resourceId: string) {
  const articleEl = document.querySelector<HTMLElement>('.resource-article');
  const notFoundCard = document.querySelector<HTMLElement>('.resource-not-found-card');

  try {
    const padded = resourceId.padStart(3, '0');
    const docRef = doc(db, 'resources', padded);
    const snap = await getDoc(docRef);

    const existsAndPublished = snap.exists() && snap.data()?.published === true;

    if (!existsAndPublished) {
      // Resource was deleted or unpublished: swap view to Not Available
      if (articleEl) {
        articleEl.style.display = 'none';
        let fallbackBox = document.getElementById('live-not-available-box');
        if (!fallbackBox) {
          fallbackBox = document.createElement('div');
          fallbackBox.id = 'live-not-available-box';
          fallbackBox.className = 'max-w-xl mx-auto text-center space-y-6 py-12';
          fallbackBox.innerHTML = `
            <div class="not-found-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">
              <span>Resource #${resourceId}</span>
              <span class="text-border-strong">•</span>
              <span>Unavailable</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground m-0">
              Resource Not Available
            </h1>
            <p class="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed m-0">
              This educational resource is currently not available in the public archive.
            </p>
            <div class="pt-2">
              <a href="/resources" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs no-underline">
                <span>View Available Resources</span>
              </a>
            </div>
          `;
          articleEl.parentNode?.appendChild(fallbackBox);
        }
      }
      return;
    }

    const data = snap.data();
    // Update title
    const titleEl = document.querySelector('.resource-detail-title');
    if (titleEl && data.title) {
      titleEl.textContent = data.title;
    }

    // Update attachments if present
    if (Array.isArray(data.attachments)) {
      const attList = document.querySelector('.attachments-list');
      if (attList) {
        attList.innerHTML = data.attachments
          .filter((att: any) => att.visible !== false)
          .map((att: any) => `
            <div class="attachment-item-card rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-border-strong transition-all">
              <div class="attachment-info flex flex-col gap-1.5">
                <h3 class="attachment-name text-sm font-semibold tracking-tight text-foreground m-0">${att.name}</h3>
                <div class="attachment-meta">
                  <span class="file-type-badge inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border border-border bg-secondary text-muted-foreground">${att.format || 'FILE'}</span>
                </div>
              </div>
              <a href="${att.url}" download class="attachment-download-link btn btn-primary inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs no-underline" aria-label="Download ${att.name}">
                <span>Download</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="download-arrow"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
              </a>
            </div>
          `)
          .join('');
      }
    }
  } catch (err) {
    console.warn('[LiveSync] Error syncing resource detail:', err);
  }
}

/**
 * 3. Synchronize the /journal Catalog Page
 */
async function syncJournalCatalog(db: any) {
  const list = document.querySelector('.journal-list');
  if (!list) return;

  let liveJournals = getCached<any[]>(CACHE_KEY_JOURNALS);

  if (!liveJournals) {
    try {
      const q = query(
        collection(db, 'journals'),
        where('published', '==', true),
        orderBy('publishedAt', 'desc')
      );
      const snap = await getDocs(q);
      liveJournals = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      setCached(CACHE_KEY_JOURNALS, liveJournals);
    } catch (err) {
      console.warn('[LiveSync] Failed to query published journals:', err);
      return;
    }
  }

  if (!liveJournals) return;

  const validSlugs = new Set(liveJournals.map((j) => j.slug));
  const existingEntries = Array.from(list.querySelectorAll<HTMLElement>('[data-journal-slug]'));

  // 1. Remove deleted or unpublished entries
  existingEntries.forEach((entry) => {
    const slug = entry.getAttribute('data-journal-slug');
    if (slug && !validSlugs.has(slug)) {
      entry.remove();
    }
  });

  // 2. Update existing entries
  liveJournals.forEach((article) => {
    const existing = list.querySelector<HTMLElement>(`[data-journal-slug="${article.slug}"]`);
    if (existing) {
      const titleEl = existing.querySelector('.entry-title');
      const excerptEl = existing.querySelector('.entry-excerpt');
      if (titleEl && article.title && titleEl.textContent !== article.title) {
        titleEl.textContent = article.title;
      }
      if (excerptEl && article.excerpt && excerptEl.textContent !== article.excerpt) {
        excerptEl.textContent = article.excerpt;
      }
    } else {
      // 3. Add new journal article
      const newEntry = document.createElement('article');
      newEntry.className = 'journal-entry-item py-7 sm:py-8.5 group transition-colors';
      newEntry.setAttribute('role', 'article');
      newEntry.setAttribute('data-journal-slug', article.slug);
      newEntry.innerHTML = `
        <a href="/journal/${article.slug}" class="entry-link block no-underline text-inherit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-lg" aria-label="Read entry: ${article.title}">
          <h2 class="entry-title text-xl sm:text-[22px] font-semibold tracking-tight text-foreground group-hover:text-foreground/80 transition-colors m-0 mb-2.5 leading-snug">
            ${article.title}
          </h2>
          <p class="entry-excerpt text-sm sm:text-[15px] font-normal text-muted-foreground leading-relaxed m-0 mb-4 max-w-2xl">
            ${article.excerpt || ''}
          </p>
          <div class="entry-action flex items-center text-xs sm:text-[13px] font-medium text-foreground">
            <span class="inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
              <span>Read entry</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="entry-arrow text-muted-foreground group-hover:text-foreground transition-colors"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </span>
          </div>
        </a>
      `;
      list.appendChild(newEntry);
    }
  });
}

/**
 * 4. Synchronize the /journal/[slug] Detail Page
 */
async function syncJournalDetail(db: any, slug: string) {
  const articleEl = document.querySelector<HTMLElement>('.journal-article-page');
  if (!articleEl) return;

  try {
    const docRef = doc(db, 'journals', slug);
    const snap = await getDoc(docRef);

    const existsAndPublished = snap.exists() && snap.data()?.published === true;

    if (!existsAndPublished) {
      articleEl.innerHTML = `
        <div class="max-w-xl mx-auto text-center space-y-6 py-16">
          <div class="not-found-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">
            <span>Journal</span>
            <span class="text-border-strong">•</span>
            <span>Unavailable</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground m-0">
            Article Not Available
          </h1>
          <p class="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed m-0">
            This journal article is currently not published or has been moved.
          </p>
          <div class="pt-2">
            <a href="/journal" class="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs no-underline">
              <span>Return to Journal</span>
            </a>
          </div>
        </div>
      `;
      return;
    }

    const data = snap.data();
    const titleEl = document.querySelector('.article-title');
    if (titleEl && data.title) {
      titleEl.textContent = data.title;
    }
  } catch (err) {
    console.warn('[LiveSync] Error syncing journal detail:', err);
  }
}

/**
 * 5. Synchronize Featured Resources on Homepage
 */
async function syncFeaturedResources(db: any) {
  const section = document.querySelector('.featured-resources-section');
  if (!section) return;

  const cached = getCached<any[]>(CACHE_KEY_RESOURCES);
  let liveResources = cached;

  if (!liveResources) {
    try {
      const q = query(
        collection(db, 'resources'),
        where('published', '==', true),
        orderBy('resourceNumber', 'asc')
      );
      const snap = await getDocs(q);
      liveResources = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      setCached(CACHE_KEY_RESOURCES, liveResources);
    } catch {
      return;
    }
  }

  if (!liveResources) return;

  const validNumbers = new Set(liveResources.map((r) => String(r.resourceNumber)));
  const cards = Array.from(section.querySelectorAll<HTMLElement>('[data-featured-resource-number]'));

  cards.forEach((card) => {
    const num = card.getAttribute('data-featured-resource-number');
    if (num && !validNumbers.has(num)) {
      card.remove();
    } else if (num) {
      const res = liveResources!.find((r) => String(r.resourceNumber) === num);
      if (res) {
        const titleEl = card.querySelector('.resource-title');
        const descEl = card.querySelector('.resource-desc');
        if (titleEl && res.title && titleEl.textContent !== res.title) {
          titleEl.textContent = res.title;
        }
        if (descEl && res.description && descEl.textContent !== res.description) {
          descEl.textContent = res.description;
        }
      }
    }
  });
}

/**
 * Primary Controller Initialization
 */
function initLiveSync() {
  if (typeof window === 'undefined') return;

  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';

  // Do not run on Admin Portal (Admin has its own interactive React state)
  if (pathname.startsWith('/admin')) {
    return;
  }

  const db = initClientFirestore();
  if (!db) return;

  // Execute route-specific live synchronization
  if (pathname === '/resources') {
    syncResourcesCatalog(db);
  } else if (pathname.startsWith('/resources/')) {
    const parts = pathname.split('/').filter(Boolean);
    const id = parts[1];
    if (id) syncResourceDetail(db, id);
  } else if (pathname === '/journal') {
    syncJournalCatalog(db);
  } else if (pathname.startsWith('/journal/')) {
    const parts = pathname.split('/').filter(Boolean);
    const slug = parts[1];
    if (slug) syncJournalDetail(db, slug);
  } else if (pathname === '/') {
    syncFeaturedResources(db);
  }
}

// Auto-run when DOM is interactive
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLiveSync);
  } else {
    initLiveSync();
  }
}
