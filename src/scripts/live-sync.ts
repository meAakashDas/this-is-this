/**
 * Real-Time Client-Side Synchronization Engine for RisePaisa
 *
 * Ensures that changes made in the Admin Portal (create, edit, delete, unpublish)
 * across Profile, Homepage, About, Resources, Journal, and Website Settings
 * are immediately reflected across public frontend routes without requiring a rebuild.
 *
 * Designed with short-TTL session caching to respect Firebase Spark plan limits (50,000 daily reads).
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
const CACHE_KEY_HOME = 'risepaisa_live_home';
const CACHE_KEY_ABOUT = 'risepaisa_live_about';
const CACHE_KEY_SETTINGS = 'risepaisa_live_settings';
const CACHE_KEY_TIME = 'risepaisa_live_timestamp';
const CACHE_TTL_MS = 10 * 1000; // 10-second cache TTL

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

function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafePublicUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith('blob:') || lower.startsWith('javascript:')) return false;
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) return true;
  if (
    lower.startsWith('data:image/') ||
    lower.startsWith('data:application/') ||
    lower.startsWith('data:text/csv') ||
    lower.startsWith('data:text/plain')
  ) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch {
    return false;
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
  } catch {
    // Ignore storage quota errors (e.g. large inline Data URIs)
  }
}

function sortPublishedResources(list: any[]): any[] {
  return [...list].sort((a, b) => {
    const orderA = a.order && a.order > 0 ? a.order : 9999;
    const orderB = b.order && b.order > 0 ? b.order : 9999;
    if (orderA !== orderB) return orderA - orderB;
    return String(a.resourceNumber).localeCompare(String(b.resourceNumber), undefined, {
      numeric: true,
    });
  });
}

async function fetchPublishedResourcesLive(db: any): Promise<any[] | null> {
  const cached = getCached<any[]>(CACHE_KEY_RESOURCES);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, 'resources'),
      where('published', '==', true),
      orderBy('resourceNumber', 'asc')
    );
    const snap = await getDocs(q);
    const list = sortPublishedResources(
      snap.docs
        .map((d) => ({ ...d.data(), id: d.id }))
        .filter((r: any) => r.published === true && r.status !== 'draft' && r.status !== 'archived')
    );
    setCached(CACHE_KEY_RESOURCES, list);
    return list;
  } catch (err) {
    console.warn('[LiveSync] Failed to query published resources:', err);
    return null;
  }
}

async function fetchPublishedJournalsLive(db: any): Promise<any[] | null> {
  const cached = getCached<any[]>(CACHE_KEY_JOURNALS);
  if (cached) return cached;

  try {
    const q = query(
      collection(db, 'journals'),
      where('published', '==', true),
      orderBy('publishedAt', 'desc')
    );
    const snap = await getDocs(q);
    const list = snap.docs
      .map((d) => ({ ...d.data(), id: d.id }))
      .filter((j: any) => j.published === true && j.status !== 'draft' && j.status !== 'archived')
      .sort((a: any, b: any) => (a.order ?? 999) - (b.order ?? 999));
    setCached(CACHE_KEY_JOURNALS, list);
    return list;
  } catch (err) {
    console.warn('[LiveSync] Failed to query published journals:', err);
    return null;
  }
}

function getFileExtLabel(att: any): string {
  const ext = (att.fileExtension || '').toUpperCase();
  if (ext) return ext;
  const lowerFormat = (att.format || '').toLowerCase();
  const lowerUrl = (att.url || '').toLowerCase();
  if (lowerFormat.includes('pdf') || lowerUrl.endsWith('.pdf')) return 'PDF';
  if (lowerFormat.includes('csv') || lowerUrl.endsWith('.csv')) return 'CSV';
  if (lowerFormat.includes('xlsx') || lowerUrl.endsWith('.xlsx')) return 'XLSX';
  if (lowerFormat.includes('docx') || lowerUrl.endsWith('.docx')) return 'DOCX';
  if (lowerFormat.includes('link')) return 'LINK';
  return 'FILE';
}

/**
 * 1. Synchronize the /resources Catalog Page
 */
async function syncResourcesCatalog(db: any) {
  const grid = document.querySelector<HTMLElement>('.resources-library-grid');
  if (!grid) return;

  const liveResources = await fetchPublishedResourcesLive(db);
  if (!liveResources) return;

  if (liveResources.length === 0) {
    grid.innerHTML = `
      <div class="empty-resources-card rounded-xl border border-border bg-card p-12 text-center text-muted-foreground text-sm col-span-full">
        <p class="empty-resources-text m-0">No resources published yet.</p>
      </div>
    `;
    return;
  }

  const emptyCard = grid.querySelector('.empty-resources-card');
  if (emptyCard) emptyCard.remove();

  const validIds = new Set(liveResources.map((r) => String(r.id || r.resourceNumber)));
  const validNumbers = new Set(liveResources.map((r) => String(r.resourceNumber)));
  Array.from(grid.querySelectorAll<HTMLElement>('.resource-row-card')).forEach((card) => {
    const id = card.getAttribute('data-resource-id');
    const num = card.getAttribute('data-resource-number');
    if ((id && !validIds.has(id)) && (num && !validNumbers.has(num))) {
      card.remove();
    }
  });

  liveResources.forEach((res) => {
    const docIdStr = String(res.id || res.resourceNumber);
    const numStr = String(res.resourceNumber);
    let card =
      grid.querySelector<HTMLElement>(`[data-resource-id="${CSS.escape(docIdStr)}"]`) ||
      grid.querySelector<HTMLElement>(`[data-resource-number="${CSS.escape(numStr)}"]`);
    const labelText = res.cardActionLabel || 'Open';
    const targetHref = `/resources/${docIdStr}`;

    if (card) {
      card.setAttribute('data-resource-id', docIdStr);
      card.setAttribute('data-resource-number', numStr);
      const linkEl = card.querySelector<HTMLAnchorElement>('a.resource-card-link');
      if (linkEl) {
        linkEl.href = targetHref;
        linkEl.setAttribute('aria-label', `Open Resource ${numStr}: ${res.title || ''}`);
      }
      const numEl = card.querySelector('.resource-num');
      if (numEl && numEl.textContent?.trim() !== `NO. ${numStr}`) {
        numEl.textContent = `NO. ${numStr}`;
      }
      const titleEl = card.querySelector('.resource-title');
      const descEl = card.querySelector('.resource-desc');
      if (titleEl && res.title && titleEl.textContent !== res.title) {
        titleEl.textContent = res.title;
      }
      if (descEl && res.description !== undefined && descEl.textContent !== res.description) {
        descEl.textContent = res.description || '';
      }
    } else {
      card = document.createElement('article');
      card.className =
        'resource-row-card group rounded-xl border border-border bg-card text-card-foreground shadow-xs hover:border-border-strong transition-all flex flex-col h-full p-5 sm:p-6';
      card.setAttribute('role', 'listitem');
      card.setAttribute('data-resource-id', docIdStr);
      card.setAttribute('data-resource-number', numStr);
      card.innerHTML = `
        <a href="${escapeHtml(targetHref)}" class="resource-card-link flex flex-col flex-1 no-underline text-inherit" aria-label="Open Resource ${escapeHtml(numStr)}: ${escapeHtml(res.title)}">
          <div class="resource-card-header flex items-center justify-between gap-2 mb-3 sm:mb-3.5">
            <span class="resource-num inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">
              NO. ${escapeHtml(numStr)}
            </span>
          </div>
          <div class="resource-card-body flex-1 flex flex-col mb-4">
            <h3 class="resource-title text-lg sm:text-[19px] font-semibold tracking-tight text-foreground group-hover:text-foreground transition-colors m-0 mb-2">
              ${escapeHtml(res.title)}
            </h3>
            <p class="resource-desc text-sm sm:text-[14.5px] text-muted-foreground leading-relaxed m-0 flex-1">
              ${escapeHtml(res.description || '')}
            </p>
          </div>
          <div class="resource-card-footer flex items-center justify-end pt-3 mt-auto border-t border-border text-xs">
            <span class="resource-open-action inline-flex items-center gap-1 font-medium text-foreground group-hover:translate-x-0.5 transition-transform">
              <span>${escapeHtml(labelText)}</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="open-arrow"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </span>
          </div>
        </a>
      `;
    }
    grid.appendChild(card);
  });
}

function dataPdfUriToBlobUrl(dataUri: string): string {
  if (!dataUri.startsWith('data:application/pdf')) return dataUri;
  try {
    const base64Part = dataUri.split(',')[1];
    if (!base64Part) return dataUri;
    const byteChars = atob(base64Part);
    const byteNumbers = new Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteNumbers[i] = byteChars.charCodeAt(i);
    }
    return URL.createObjectURL(new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' }));
  } catch {
    return dataUri;
  }
}

function hydratePdfPreviewElement(pdfSection: HTMLElement, pdfUrl: string) {
  const obj = pdfSection.querySelector<HTMLObjectElement>('object.pdf-object');
  const iframe = pdfSection.querySelector<HTMLIFrameElement>('iframe.pdf-iframe');
  if (obj && obj.getAttribute('data-raw-pdf') !== pdfUrl) {
    obj.setAttribute('data-raw-pdf', pdfUrl);
    const renderUrl = dataPdfUriToBlobUrl(pdfUrl);
    obj.setAttribute('data', renderUrl);
    if (iframe) iframe.setAttribute('src', renderUrl);
  }
}

function renderAttachmentsHtml(attachments: any[]): string {
  return attachments
    .filter((att: any) => att.visible !== false && isSafePublicUrl(att.url))
    .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
    .map((att: any) => {
      const fileType = getFileExtLabel(att);
      const isExternal = att.url.startsWith('http://') || att.url.startsWith('https://');
      const dlName = att.fileName || att.name || 'resource-file';
      return `
        <div class="attachment-item-card rounded-xl border border-border bg-card text-card-foreground p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs hover:border-border-strong transition-all">
          <div class="attachment-info flex flex-col gap-1.5">
            <h3 class="attachment-name text-sm font-semibold tracking-tight text-foreground m-0">${escapeHtml(att.name)}</h3>
            ${att.description ? `<p class="attachment-desc text-xs text-muted-foreground m-0">${escapeHtml(att.description)}</p>` : ''}
            <div class="attachment-meta">
              <span class="file-type-badge inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border border-border bg-secondary text-muted-foreground">${escapeHtml(fileType)}</span>
            </div>
          </div>
          <a
            href="${escapeHtml(att.url)}"
            ${isExternal ? 'target="_blank" rel="noopener noreferrer"' : `download="${escapeHtml(dlName)}"`}
            class="attachment-download-link btn btn-primary inline-flex items-center justify-center gap-1.5 h-9 px-4 text-xs font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs no-underline"
            aria-label="Download ${escapeHtml(att.name)}"
          >
            <span>Download</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="download-arrow"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
          </a>
        </div>
      `;
    })
    .join('');
}

function renderDynamicResourceDetail(container: HTMLElement, data: any) {
  const num = escapeHtml(data.resourceNumber || '001');
  const title = escapeHtml(data.title || 'Untitled Resource');
  const attachments = Array.isArray(data.attachments)
    ? data.attachments.filter((a: any) => a.visible !== false && isSafePublicUrl(a.url))
    : [];
  const externalLinks = Array.isArray(data.externalLinks)
    ? data.externalLinks.filter((l: any) => isSafePublicUrl(l.url))
    : [];
  const pdfUrl = isSafePublicUrl(data.pdfPreviewUrl)
    ? data.pdfPreviewUrl
    : isSafePublicUrl(data.downloadUrl)
    ? data.downloadUrl
    : '';
  const docxUrl = isSafePublicUrl(data.docxUrl) ? data.docxUrl : '';
  const bodyHtml = data.blocknoteHtml || data.contentHtml || '';

  container.innerHTML = `
    <div class="page-container resource-detail-page max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 pb-24">
      <article class="resource-article space-y-8 sm:space-y-10" data-resource-id="${num}">
        <nav class="resource-nav-crumb flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <a href="/resources" class="crumb-link inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors no-underline">
            <span>← All Resources</span>
          </a>
          <span class="crumb-sep text-muted-foreground/60" aria-hidden="true">/</span>
          <span class="crumb-current font-mono text-xs text-muted-foreground">Resource #${num}</span>
        </nav>

        <header class="resource-detail-header space-y-3 sm:space-y-3.5">
          <div class="resource-num-row">
            <span class="resource-num-badge inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">
              NO. ${num}
            </span>
          </div>
          <h1 class="resource-detail-title resource-title text-2xl sm:text-3xl lg:text-[34px] font-semibold tracking-tight text-foreground m-0 text-balance">${title}</h1>
          ${data.publishedAt ? `<div class="resource-date-row"><time datetime="${escapeHtml(data.publishedAt)}" class="resource-date text-xs font-mono text-muted-foreground">Published ${escapeHtml(data.publishedAt)}</time></div>` : ''}
          <div class="resource-top-actions flex items-center gap-2.5 pt-2 flex-wrap">
            ${pdfUrl ? `<a href="${escapeHtml(pdfUrl)}" download="resource-${num}.pdf" class="action-btn btn-save-pdf btn btn-secondary inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-secondary text-foreground transition-colors shadow-xs no-underline"><span>Save as PDF</span></a>` : ''}
            ${docxUrl ? `<a href="${escapeHtml(docxUrl)}" download="resource-${num}.docx" class="action-btn btn-save-docx btn btn-secondary inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-secondary text-foreground transition-colors shadow-xs no-underline"><span>Save as DOCX</span></a>` : ''}
          </div>
        </header>

        <div class="h-px bg-border w-full" role="separator"></div>

        ${isSafePublicUrl(data.coverImage) ? `<figure class="resource-cover-figure rounded-xl overflow-hidden border border-border bg-secondary shadow-xs m-0"><img src="${escapeHtml(data.coverImage)}" alt="${escapeHtml(data.thumbnailAlt || data.title)}" class="resource-cover-img w-full max-h-80 object-cover block" /></figure>` : ''}
        ${data.fullDescription ? `<div class="resource-full-description text-sm sm:text-base text-muted-foreground leading-relaxed"><p class="m-0">${escapeHtml(data.fullDescription)}</p></div>` : ''}

        ${attachments.length > 0 ? `
          <section class="resource-section attachments-section space-y-4">
            <h2 id="attachments-section-heading" class="section-heading text-xl sm:text-[22px] font-semibold tracking-tight text-foreground m-0">${escapeHtml(data.detailActionLabel || 'Download Resources')}</h2>
            <div class="attachments-list flex flex-col gap-3">${renderAttachmentsHtml(attachments)}</div>
          </section>
        ` : ''}

        ${externalLinks.length > 0 ? `
          <section class="resource-section external-links-section space-y-3">
            <h2 class="section-heading text-lg font-semibold tracking-tight text-foreground m-0">External Links</h2>
            <div class="external-links-list flex flex-col gap-2.5">
              ${externalLinks.map((lnk: any) => `
                <a href="${escapeHtml(lnk.url)}" target="_blank" rel="noopener noreferrer" class="external-link-card rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4 shadow-xs hover:border-border-strong transition-all no-underline text-inherit">
                  <div>
                    <div class="text-sm font-semibold text-foreground">${escapeHtml(lnk.label)}</div>
                    ${lnk.description ? `<div class="text-xs text-muted-foreground">${escapeHtml(lnk.description)}</div>` : ''}
                  </div>
                  <span class="text-xs font-medium text-primary">Open ↗</span>
                </a>
              `).join('')}
            </div>
          </section>
        ` : ''}

        ${bodyHtml ? `<section class="resource-section written-content-section space-y-6"><div class="main-educational-content space-y-6"><div class="resource-document-content resource-content editorial-reading-container max-w-none space-y-4">${bodyHtml}</div></div></section>` : ''}

        ${pdfUrl ? `
          <section id="view-as-pdf" class="resource-section pdf-preview-section rounded-xl border border-border bg-card overflow-hidden shadow-xs scroll-mt-20">
            <div class="preview-header flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-secondary/50 flex-wrap">
              <h2 id="pdf-preview-heading" class="section-heading text-base sm:text-lg font-semibold tracking-tight text-foreground m-0">View as PDF</h2>
              <div class="preview-actions-bar flex items-center gap-2 flex-wrap">
                <a href="${escapeHtml(pdfUrl)}" download="resource-${num}.pdf" class="preview-action-btn btn-download-pdf btn btn-secondary inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-secondary text-foreground transition-colors shadow-xs no-underline"><span>Download PDF</span></a>
              </div>
            </div>
            <div class="preview-viewer-container w-full h-[580px] sm:h-[640px] bg-background" id="pdf-viewer-frame">
              <object data="" type="application/pdf" class="pdf-object w-full h-full border-0 block"><iframe src="" class="pdf-iframe w-full h-full border-0" loading="lazy"></iframe></object>
            </div>
          </section>
        ` : ''}
      </article>
    </div>
  `;

  if (pdfUrl) {
    const pdfSec = container.querySelector<HTMLElement>('.pdf-preview-section');
    if (pdfSec) hydratePdfPreviewElement(pdfSec, pdfUrl);
  }
}

/**
 * 2. Synchronize the /resources/[id] Detail Page (or render newly published resource on 404)
 */
async function syncResourceDetail(db: any, resourceId: string) {
  const articleEl = document.querySelector<HTMLElement>('.resource-article');
  const notFoundCard = document.querySelector<HTMLElement>('.resource-not-found-card');
  const errorCard = document.querySelector<HTMLElement>('.error-card');
  const mainContent = document.getElementById('main-content');

  try {
    const padded = /^\d+$/.test(resourceId) && resourceId.length < 3 ? resourceId.padStart(3, '0') : resourceId;
    let snap = await getDoc(doc(db, 'resources', resourceId));
    if (!snap.exists() && padded !== resourceId) {
      snap = await getDoc(doc(db, 'resources', padded));
    }

    if (!snap.exists()) {
      const q = query(
        collection(db, 'resources'),
        where('published', '==', true),
        where('resourceNumber', '==', padded)
      );
      const qSnap = await getDocs(q);
      if (!qSnap.empty) {
        snap = qSnap.docs[0];
      }
    }

    const data = snap.exists() ? snap.data() : null;
    const existsAndPublished =
      Boolean(data) &&
      data?.published === true &&
      data?.status !== 'draft' &&
      data?.status !== 'archived';

    if (!existsAndPublished) {
      if (articleEl) {
        articleEl.style.display = 'none';
        let fallbackBox = document.getElementById('live-not-available-box');
        if (!fallbackBox) {
          fallbackBox = document.createElement('div');
          fallbackBox.id = 'live-not-available-box';
          fallbackBox.className = 'max-w-xl mx-auto text-center space-y-6 py-12';
          fallbackBox.innerHTML = `
            <div class="not-found-badge inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">
              <span>Resource #${escapeHtml(resourceId)}</span>
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

    // If static build didn't have this resource yet (404 or not-found placeholder), render full page dynamically
    if ((!articleEl || notFoundCard || errorCard) && mainContent) {
      renderDynamicResourceDetail(mainContent, data);
      return;
    }

    if (!articleEl) return;

    // Update Header & Breadcrumb fields
    const numBadge = articleEl.querySelector('.resource-num-badge');
    if (numBadge && data.resourceNumber) {
      numBadge.textContent = `NO. ${data.resourceNumber}`;
    }

    const crumbCurrent = articleEl.querySelector('.crumb-current');
    if (crumbCurrent && data.resourceNumber) {
      crumbCurrent.textContent = `Resource #${data.resourceNumber}`;
    }

    // Sync Adjacent Previous / Next Resource links cleanly using immutable doc IDs
    const navAdjacentEl = articleEl.querySelector<HTMLElement>('.resource-adjacent-nav .adjacent-links-row');
    if (navAdjacentEl) {
      const liveList = await fetchPublishedResourcesLive(db);
      if (liveList && liveList.length > 0) {
        const currentDocId = snap.id || data.id || resourceId;
        const idx = liveList.findIndex(
          (r) =>
            String(r.id) === String(currentDocId) ||
            String(r.resourceNumber) === String(data.resourceNumber)
        );
        if (idx !== -1) {
          const prevRes = idx > 0 ? liveList[idx - 1] : null;
          const nextRes = idx < liveList.length - 1 ? liveList[idx + 1] : null;
          navAdjacentEl.innerHTML = `
            ${prevRes ? `
              <a href="/resources/${escapeHtml(prevRes.id || prevRes.resourceNumber)}" class="adjacent-nav-link adjacent-prev flex items-center gap-3 p-5 rounded-xl border border-border bg-card text-card-foreground hover:border-border-strong hover:shadow-xs transition-all flex-1 max-w-sm no-underline text-inherit" aria-label="Previous Resource: ${escapeHtml(prevRes.title)}">
                <span class="nav-dir-arrow text-muted-foreground" aria-hidden="true">←</span>
                <div class="nav-text-group flex flex-col gap-0.5 min-w-0">
                  <span class="nav-label text-[11px] font-mono font-medium uppercase tracking-wider text-muted-foreground">Previous Resource</span>
                  <span class="nav-resource-title text-sm font-semibold text-foreground truncate">${escapeHtml(prevRes.title)}</span>
                </div>
              </a>
            ` : '<div class="adjacent-empty flex-1"></div>'}
            ${nextRes ? `
              <a href="/resources/${escapeHtml(nextRes.id || nextRes.resourceNumber)}" class="adjacent-nav-link adjacent-next flex items-center justify-between gap-3 p-5 rounded-xl border border-border bg-card text-card-foreground hover:border-border-strong hover:shadow-xs transition-all flex-1 max-w-sm sm:ml-auto text-right no-underline text-inherit" aria-label="Next Resource: ${escapeHtml(nextRes.title)}">
                <div class="nav-text-group flex flex-col gap-0.5 min-w-0 text-left sm:text-right">
                  <span class="nav-label text-[11px] font-mono font-medium uppercase tracking-wider text-muted-foreground">Next Resource</span>
                  <span class="nav-resource-title text-sm font-semibold text-foreground truncate">${escapeHtml(nextRes.title)}</span>
                </div>
                <span class="nav-dir-arrow text-muted-foreground" aria-hidden="true">→</span>
              </a>
            ` : '<div class="adjacent-empty flex-1"></div>'}
          `;
        }
      }
    }

    const titleEl = articleEl.querySelector('.resource-detail-title');
    if (titleEl && data.title) {
      titleEl.textContent = data.title;
    }

    const dateEl = articleEl.querySelector('.resource-date');
    if (dateEl && data.publishedAt) {
      dateEl.textContent = `Published ${data.publishedAt}`;
      dateEl.setAttribute('datetime', data.publishedAt);
    }

    // Cover image sync
    const existingCover = articleEl.querySelector<HTMLElement>('.resource-cover-figure');
    if (isSafePublicUrl(data.coverImage)) {
      if (existingCover) {
        const img = existingCover.querySelector<HTMLImageElement>('img');
        if (img) {
          img.src = data.coverImage;
          img.alt = data.thumbnailAlt || data.title || '';
        }
      } else {
        const divider = articleEl.querySelector('header + div[role="separator"]');
        if (divider) {
          const fig = document.createElement('figure');
          fig.className = 'resource-cover-figure rounded-xl overflow-hidden border border-border bg-secondary shadow-xs m-0';
          fig.innerHTML = `<img src="${escapeHtml(data.coverImage)}" alt="${escapeHtml(data.thumbnailAlt || data.title)}" class="resource-cover-img w-full max-h-80 object-cover block" loading="lazy" />`;
          divider.after(fig);
        }
      }
    } else if (existingCover) {
      existingCover.remove();
    }

    // Full description sync
    const existingFullDesc = articleEl.querySelector<HTMLElement>('.resource-full-description');
    if (data.fullDescription) {
      if (existingFullDesc) {
        existingFullDesc.innerHTML = `<p class="m-0">${escapeHtml(data.fullDescription)}</p>`;
      } else {
        const anchor = articleEl.querySelector('.resource-cover-figure') || articleEl.querySelector('header + div[role="separator"]');
        if (anchor) {
          const div = document.createElement('div');
          div.className = 'resource-full-description text-sm sm:text-base text-muted-foreground leading-relaxed';
          div.innerHTML = `<p class="m-0">${escapeHtml(data.fullDescription)}</p>`;
          anchor.after(div);
        }
      }
    } else if (existingFullDesc) {
      existingFullDesc.remove();
    }

    // Top action links & PDF preview sync
    const pdfUrl = isSafePublicUrl(data.pdfPreviewUrl)
      ? data.pdfPreviewUrl
      : isSafePublicUrl(data.downloadUrl)
      ? data.downloadUrl
      : '';
    const docxUrl = isSafePublicUrl(data.docxUrl) ? data.docxUrl : '';

    const savePdfBtn = articleEl.querySelector<HTMLAnchorElement>('a.btn-save-pdf');
    const downloadPdfBtn = articleEl.querySelector<HTMLAnchorElement>('a.btn-download-pdf');
    const viewPdfBtn = articleEl.querySelector<HTMLAnchorElement>('a.btn-view-pdf');
    let pdfSection = articleEl.querySelector<HTMLElement>('.pdf-preview-section');

    if (pdfUrl) {
      if (savePdfBtn) {
        savePdfBtn.href = pdfUrl;
        savePdfBtn.style.display = '';
      }
      if (viewPdfBtn) {
        viewPdfBtn.style.display = '';
      }
      if (!pdfSection) {
        const navAdjacent = articleEl.querySelector('.resource-adjacent-nav');
        pdfSection = document.createElement('section');
        pdfSection.id = 'view-as-pdf';
        pdfSection.className = 'resource-section pdf-preview-section rounded-xl border border-border bg-card overflow-hidden shadow-xs scroll-mt-20';
        pdfSection.innerHTML = `
          <div class="preview-header flex items-center justify-between gap-3 p-4 sm:p-5 border-b border-border bg-secondary/50 flex-wrap">
            <h2 id="pdf-preview-heading" class="section-heading text-base sm:text-lg font-semibold tracking-tight text-foreground m-0">View as PDF</h2>
            <div class="preview-actions-bar flex items-center gap-2 flex-wrap">
              <a href="${escapeHtml(pdfUrl)}" download="resource-${escapeHtml(data.resourceNumber || '001')}.pdf" class="preview-action-btn btn-download-pdf btn btn-secondary inline-flex items-center gap-1.5 h-9 px-3.5 text-xs font-medium rounded-md border border-input bg-background hover:bg-secondary text-foreground transition-colors shadow-xs no-underline"><span>Download PDF</span></a>
            </div>
          </div>
          <div class="preview-viewer-container w-full h-[580px] sm:h-[640px] bg-background" id="pdf-viewer-frame">
            <object data="" type="application/pdf" class="pdf-object w-full h-full border-0 block"><iframe src="" class="pdf-iframe w-full h-full border-0" loading="lazy"></iframe></object>
          </div>
        `;
        if (navAdjacent) {
          navAdjacent.before(pdfSection);
        } else {
          articleEl.appendChild(pdfSection);
        }
      } else {
        pdfSection.style.display = '';
      }
      const dlPdfBtn = pdfSection.querySelector<HTMLAnchorElement>('a.btn-download-pdf') || downloadPdfBtn;
      if (dlPdfBtn) dlPdfBtn.href = pdfUrl;
      hydratePdfPreviewElement(pdfSection, pdfUrl);
    } else {
      if (savePdfBtn) savePdfBtn.style.display = 'none';
      if (viewPdfBtn) viewPdfBtn.style.display = 'none';
      if (pdfSection) pdfSection.style.display = 'none';
    }

    articleEl.querySelectorAll<HTMLAnchorElement>('a.btn-save-docx').forEach((btn) => {
      if (docxUrl) {
        btn.href = docxUrl;
        btn.style.display = '';
      } else {
        btn.style.display = 'none';
      }
    });

    // Attachments sync
    if (Array.isArray(data.attachments)) {
      const attSection = articleEl.querySelector<HTMLElement>('.attachments-section');
      const visibleAtts = data.attachments.filter((a: any) => a.visible !== false && isSafePublicUrl(a.url));
      if (visibleAtts.length > 0) {
        if (attSection) {
          attSection.style.display = '';
          const attHeading = attSection.querySelector('#attachments-section-heading');
          if (attHeading && data.detailActionLabel) {
            attHeading.textContent = data.detailActionLabel;
          }
          const attList = attSection.querySelector('.attachments-list');
          if (attList) {
            attList.innerHTML = renderAttachmentsHtml(visibleAtts);
          }
        } else {
          const anchor = articleEl.querySelector('.resource-full-description') || articleEl.querySelector('.resource-cover-figure') || articleEl.querySelector('header + div[role="separator"]');
          if (anchor) {
            const sec = document.createElement('section');
            sec.className = 'resource-section attachments-section space-y-4';
            sec.innerHTML = `
              <div class="section-header">
                <h2 id="attachments-section-heading" class="section-heading text-xl sm:text-[22px] font-semibold tracking-tight text-foreground m-0">${escapeHtml(data.detailActionLabel || 'Download Resources')}</h2>
              </div>
              <div class="attachments-list flex flex-col gap-3">${renderAttachmentsHtml(visibleAtts)}</div>
            `;
            anchor.after(sec);
          }
        }
      } else if (attSection) {
        attSection.style.display = 'none';
      }
    }

    // External links sync
    const extLinks = Array.isArray(data.externalLinks)
      ? data.externalLinks.filter((l: any) => isSafePublicUrl(l.url))
      : [];
    const existingExtSec = articleEl.querySelector<HTMLElement>('.external-links-section');
    if (extLinks.length > 0) {
      const extHtml = `
        <h2 class="section-heading text-lg font-semibold tracking-tight text-foreground m-0">External Links</h2>
        <div class="external-links-list flex flex-col gap-2.5">
          ${extLinks.map((lnk: any) => `
            <a href="${escapeHtml(lnk.url)}" target="_blank" rel="noopener noreferrer" class="external-link-card rounded-xl border border-border bg-card p-4 flex items-center justify-between gap-4 shadow-xs hover:border-border-strong transition-all no-underline text-inherit">
              <div class="space-y-0.5">
                <div class="text-sm font-semibold text-foreground">${escapeHtml(lnk.label)}</div>
                ${lnk.description ? `<div class="text-xs text-muted-foreground">${escapeHtml(lnk.description)}</div>` : ''}
              </div>
              <span class="text-xs font-medium text-primary shrink-0">Open ↗</span>
            </a>
          `).join('')}
        </div>
      `;
      if (existingExtSec) {
        existingExtSec.innerHTML = extHtml;
      } else {
        const anchor = articleEl.querySelector('.attachments-section') || articleEl.querySelector('header + div[role="separator"]');
        if (anchor) {
          const sec = document.createElement('section');
          sec.className = 'resource-section external-links-section space-y-3';
          sec.innerHTML = extHtml;
          anchor.after(sec);
        }
      }
    } else if (existingExtSec) {
      existingExtSec.remove();
    }

    // Written content HTML sync
    const bodyHtml = typeof data.blocknoteHtml === 'string' && data.blocknoteHtml.trim()
      ? data.blocknoteHtml
      : typeof data.contentHtml === 'string'
      ? data.contentHtml
      : '';
    let contentSection = articleEl.querySelector<HTMLElement>('.written-content-section');
    let contentEl = articleEl.querySelector<HTMLElement>('.resource-document-content, .resource-content');

    if (bodyHtml.trim()) {
      if (!contentSection) {
        contentSection = document.createElement('section');
        contentSection.className = 'resource-section written-content-section space-y-6';
        contentSection.innerHTML = `<div class="main-educational-content space-y-6"><div class="resource-document-content resource-content editorial-reading-container max-w-none space-y-4"></div></div>`;
        const anchor = articleEl.querySelector('.external-links-section') || articleEl.querySelector('.attachments-section') || articleEl.querySelector('header + div[role="separator"]');
        if (anchor) {
          anchor.after(contentSection);
        } else {
          articleEl.appendChild(contentSection);
        }
        contentEl = contentSection.querySelector<HTMLElement>('.resource-document-content');
      }
      contentSection.style.display = '';
      if (contentEl && contentEl.innerHTML !== bodyHtml) {
        contentEl.innerHTML = bodyHtml;
      }
    } else if (contentSection) {
      contentSection.style.display = 'none';
    }
  } catch (err) {
    console.warn('[LiveSync] Error syncing resource detail:', err);
  }
}

/**
 * 3. Synchronize the /journal Catalog Page
 */
async function syncJournalCatalog(db: any) {
  const list = document.querySelector<HTMLElement>('.journal-list');
  if (!list) return;

  const liveJournals = await fetchPublishedJournalsLive(db);
  if (!liveJournals) return;

  const validSlugs = new Set(liveJournals.map((j) => j.slug));
  Array.from(list.querySelectorAll<HTMLElement>('[data-journal-slug]')).forEach((entry) => {
    const slug = entry.getAttribute('data-journal-slug');
    if (slug && !validSlugs.has(slug)) {
      entry.remove();
    }
  });

  liveJournals.forEach((article) => {
    let existing = list.querySelector<HTMLElement>(`[data-journal-slug="${CSS.escape(article.slug)}"]`);
    if (existing) {
      const titleEl = existing.querySelector('.entry-title');
      const excerptEl = existing.querySelector('.entry-excerpt');
      if (titleEl && article.title && titleEl.textContent !== article.title) {
        titleEl.textContent = article.title;
      }
      if (excerptEl && article.excerpt !== undefined && excerptEl.textContent !== article.excerpt) {
        excerptEl.textContent = article.excerpt || '';
      }
    } else {
      existing = document.createElement('article');
      existing.className = 'journal-entry-item py-7 sm:py-8.5 group transition-colors';
      existing.setAttribute('role', 'article');
      existing.setAttribute('data-journal-slug', article.slug);
      existing.innerHTML = `
        <a href="/journal/${escapeHtml(article.slug)}" class="entry-link block no-underline text-inherit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded-lg" aria-label="Read entry: ${escapeHtml(article.title)}">
          <h2 class="entry-title text-xl sm:text-[22px] font-semibold tracking-tight text-foreground group-hover:text-foreground/80 transition-colors m-0 mb-2.5 leading-snug">
            ${escapeHtml(article.title)}
          </h2>
          <p class="entry-excerpt text-sm sm:text-[15px] font-normal text-muted-foreground leading-relaxed m-0 mb-4 max-w-2xl">
            ${escapeHtml(article.excerpt || '')}
          </p>
          <div class="entry-action flex items-center text-xs sm:text-[13px] font-medium text-foreground">
            <span class="inline-flex items-center gap-1.5 group-hover:translate-x-1 transition-transform">
              <span>Read entry</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="entry-arrow text-muted-foreground group-hover:text-foreground transition-colors"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
            </span>
          </div>
        </a>
      `;
    }
    list.appendChild(existing);
  });
}

/**
 * 4. Synchronize the /journal/[slug] Detail Page (or newly published journal on 404)
 */
async function syncJournalDetail(db: any, slug: string) {
  const articleEl = document.querySelector<HTMLElement>('.journal-article-page');
  const errorCard = document.querySelector<HTMLElement>('.error-card');
  const mainContent = document.getElementById('main-content');

  try {
    let snap = await getDoc(doc(db, 'journals', slug));
    if (!snap.exists()) {
      const q = query(
        collection(db, 'journals'),
        where('published', '==', true),
        where('slug', '==', slug)
      );
      const qSnap = await getDocs(q);
      if (!qSnap.empty) snap = qSnap.docs[0];
    }

    const data = snap.exists() ? snap.data() : null;
    const existsAndPublished =
      Boolean(data) &&
      data?.published === true &&
      data?.status !== 'draft' &&
      data?.status !== 'archived';

    if (!existsAndPublished) {
      if (articleEl) {
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
      }
      return;
    }

    const bodyHtml = data.blocknoteHtml || data.contentHtml || '';

    if (!articleEl && errorCard && mainContent) {
      mainContent.innerHTML = `
        <article class="page-container journal-article-page max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 sm:pt-12 sm:pb-24" data-journal-slug="${escapeHtml(slug)}">
          <nav class="article-nav-crumb mb-6 sm:mb-8" aria-label="Journal Navigation">
            <a href="/journal" class="journal-back-link inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground transition-colors no-underline group">
              <span>← Back to Journal</span>
            </a>
          </nav>
          <header class="article-header">
            <h1 class="article-title text-2xl sm:text-3xl md:text-[2.25rem] font-semibold tracking-tight text-foreground m-0 text-balance leading-tight">${escapeHtml(data.title)}</h1>
          </header>
          <div class="h-px bg-border w-full my-6 sm:my-8" role="separator"></div>
          <div class="article-content space-y-6 max-w-[760px]">
            <div class="journal-document-content notion-prose">${bodyHtml}</div>
          </div>
        </article>
      `;
      return;
    }

    if (!articleEl) return;

    const titleEl = articleEl.querySelector('.article-title');
    if (titleEl && data.title) {
      titleEl.textContent = data.title;
    }

    if (bodyHtml) {
      const richContainer = articleEl.querySelector('.journal-document-content');
      const contentWrapper = articleEl.querySelector('.article-content');
      const isAdminEdited = data.updatedBy === 'aakashdas.photo@gmail.com';
      if (richContainer && richContainer.innerHTML !== bodyHtml) {
        richContainer.innerHTML = bodyHtml;
      } else if (!richContainer && contentWrapper && isAdminEdited) {
        contentWrapper.innerHTML = `<div class="journal-document-content notion-prose">${bodyHtml}</div>`;
      }
    }
  } catch (err) {
    console.warn('[LiveSync] Error syncing journal detail:', err);
  }
}

/**
 * 5. Synchronize Homepage (Hero, Featured Resources, Journal Card, Finder)
 */
async function syncHomepage(db: any) {
  try {
    let homeData = getCached<any>(CACHE_KEY_HOME);
    if (!homeData) {
      const homeSnap = await getDoc(doc(db, 'pages', 'home'));
      if (homeSnap.exists()) {
        homeData = homeSnap.data();
        setCached(CACHE_KEY_HOME, homeData);
      }
    }

    if (homeData) {
      const heroTitle = document.querySelector<HTMLElement>('#hero-title');
      if (heroTitle && homeData.heroHeadline) {
        heroTitle.textContent = homeData.heroHeadline;
      }

      const heroTagline = document.querySelector<HTMLElement>('.hero-tagline');
      if (heroTagline && homeData.heroTagline) {
        heroTagline.textContent = homeData.heroTagline;
      }

      const heroRolePrefix = document.querySelector<HTMLElement>('.hero-role span');
      if (heroRolePrefix && homeData.heroRolePrefix) {
        heroRolePrefix.textContent = homeData.heroRolePrefix;
      }
      const heroBrandLink = document.querySelector<HTMLAnchorElement>('.hero-brand-link');
      if (heroBrandLink) {
        if (homeData.heroRoleBrand) heroBrandLink.textContent = homeData.heroRoleBrand;
        if (isSafePublicUrl(homeData.heroRoleUrl)) heroBrandLink.href = homeData.heroRoleUrl;
      }

      const heroImg = document.querySelector<HTMLImageElement>('.hero-portrait-img');
      if (heroImg && isSafePublicUrl(homeData.heroPhotoUrl) && heroImg.getAttribute('src') !== homeData.heroPhotoUrl) {
        heroImg.src = homeData.heroPhotoUrl;
        if (homeData.heroPhotoAlt) heroImg.alt = homeData.heroPhotoAlt;
      }

      const primaryBtn = document.querySelector<HTMLAnchorElement>('.hero-btn-primary');
      if (primaryBtn && homeData.primaryCta) {
        const span = primaryBtn.querySelector('span');
        if (span && homeData.primaryCta.text) span.textContent = homeData.primaryCta.text;
        if (isSafePublicUrl(homeData.primaryCta.url)) primaryBtn.href = homeData.primaryCta.url;
        primaryBtn.style.display = homeData.primaryCta.visible === false ? 'none' : '';
      }

      const secondaryBtn = document.querySelector<HTMLAnchorElement>('.hero-btn-secondary');
      if (secondaryBtn && homeData.secondaryCta) {
        const span = secondaryBtn.querySelector('span');
        if (span && homeData.secondaryCta.text) span.textContent = homeData.secondaryCta.text;
        if (isSafePublicUrl(homeData.secondaryCta.url)) secondaryBtn.href = homeData.secondaryCta.url;
        secondaryBtn.style.display = homeData.secondaryCta.visible === false ? 'none' : '';
      }

      const featuredHeading = document.querySelector<HTMLElement>('#featured-resources-heading');
      if (featuredHeading && homeData.sections?.featuredResources?.heading) {
        featuredHeading.textContent = homeData.sections.featuredResources.heading;
      }

      const journalHeading = document.querySelector<HTMLElement>('.journal-title-link');
      if (journalHeading && homeData.sections?.journal?.heading) {
        journalHeading.textContent = homeData.sections.journal.heading;
      }
    }

    // Sync Featured Resources grid
    const section = document.querySelector<HTMLElement>('.featured-resources-section');
    const featuredList = section?.querySelector<HTMLElement>('.featured-list');
    if (section && featuredList) {
      const liveResources = await fetchPublishedResourcesLive(db);
      if (!liveResources) return;

      const customIds: string[] | undefined = homeData?.sections?.featuredResources?.customResourceIds;
      const count: number = homeData?.sections?.featuredResources?.count || 3;

      let displayed = liveResources;
      if (Array.isArray(customIds) && customIds.length > 0) {
        const matched = customIds
          .map((id) => liveResources.find((r) => String(r.id) === String(id) || String(r.resourceNumber) === String(id)))
          .filter(Boolean);
        if (matched.length > 0) displayed = matched;
      }
      displayed = displayed.slice(0, count);

      featuredList.innerHTML = displayed
        .map(
          (res) => `
          <article class="featured-card group relative rounded-xl border border-border bg-card text-card-foreground shadow-xs hover:border-border-strong hover:shadow-sm transition-all duration-200 flex flex-col p-6 sm:p-6.5" role="listitem" data-featured-resource-number="${escapeHtml(res.resourceNumber)}" data-featured-resource-id="${escapeHtml(res.id || res.resourceNumber)}">
            <a href="/resources/${escapeHtml(res.id || res.resourceNumber)}" class="featured-card-link flex flex-col flex-1 no-underline text-inherit" aria-label="Resource ${escapeHtml(res.resourceNumber)}: ${escapeHtml(res.title)}">
              <div class="card-meta-row flex items-center mb-3.5">
                <span class="res-num-badge inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-mono font-medium tracking-wider border border-border/80 bg-secondary/80 text-muted-foreground">
                  NO. ${escapeHtml(res.resourceNumber)}
                </span>
              </div>
              <h3 class="card-title text-[18px] sm:text-[19.5px] font-semibold tracking-tight text-foreground group-hover:text-foreground leading-snug transition-colors m-0 mb-2.5">
                ${escapeHtml(res.title)}
              </h3>
              <p class="card-desc text-sm sm:text-[14.5px] text-muted-foreground leading-relaxed line-clamp-3 mb-5 flex-1 m-0">
                ${escapeHtml(res.description || '')}
              </p>
              <div class="card-footer flex items-center justify-end pt-3 mt-auto border-t border-border/70 text-xs text-muted-foreground">
                <span class="card-action inline-flex items-center gap-1.5 font-medium text-foreground text-[13px] group-hover:translate-x-0.5 transition-transform">
                  <span>${escapeHtml(res.cardActionLabel || 'Open')}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="action-arrow"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
                </span>
              </div>
            </a>
          </article>
        `
        )
        .join('');
    }
  } catch (err) {
    console.warn('[LiveSync] Error syncing homepage:', err);
  }
}

/**
 * 6. Synchronize the /about Page
 */
async function syncAboutPage(db: any) {
  const aboutPageEl = document.querySelector<HTMLElement>('.about-page');
  if (!aboutPageEl) return;

  try {
    let aboutData = getCached<any>(CACHE_KEY_ABOUT);
    if (!aboutData) {
      const snap = await getDoc(doc(db, 'pages', 'about'));
      if (snap.exists()) {
        aboutData = snap.data();
        setCached(CACHE_KEY_ABOUT, aboutData);
      }
    }
    if (!aboutData) return;

    const titleEl = aboutPageEl.querySelector<HTMLElement>('#about-intro-title');
    if (titleEl && aboutData.title) {
      titleEl.textContent = aboutData.title;
    }

    if (Array.isArray(aboutData.introParagraphs) && aboutData.introParagraphs.length > 0) {
      const leadCopy = aboutPageEl.querySelector<HTMLElement>('.about-lead-copy');
      if (leadCopy) {
        leadCopy.innerHTML = aboutData.introParagraphs
          .map((para: string, idx: number) => {
            const cls =
              idx === 0
                ? 'about-lead type-body-lg text-foreground/90 leading-relaxed font-normal m-0'
                : idx === 1
                ? 'about-body-text type-body text-muted-foreground leading-relaxed font-normal m-0'
                : 'about-sublead type-body text-muted-foreground leading-relaxed font-normal m-0';
            if (idx === 0 && para.includes('RisePaisa')) {
              const parts = para.split('RisePaisa');
              const linked =
                escapeHtml(parts[0]) +
                '<a href="https://risepaisa.com" target="_blank" rel="noopener noreferrer" class="brand-link font-semibold text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground transition-colors" aria-label="RisePaisa (opens in a new tab)">RisePaisa</a>' +
                escapeHtml(parts.slice(1).join('RisePaisa'));
              return `<p class="${cls}">${linked}</p>`;
            }
            return `<p class="${cls}">${escapeHtml(para)}</p>`;
          })
          .join('');
      }
    }

    if (Array.isArray(aboutData.workEntries) && aboutData.workEntries.length > 0) {
      const workGrid = aboutPageEl.querySelector<HTMLElement>('.work-grid');
      if (workGrid) {
        const visibleWork = aboutData.workEntries.filter((w: any) => w.visible !== false);
        workGrid.innerHTML = visibleWork
          .map((item: any) => `
            <article class="entry-card work-card rounded-xl border border-border bg-card text-card-foreground shadow-xs hover:border-border-strong transition-all flex flex-col h-full p-5 sm:p-6">
              <div class="card-top-bar flex items-center justify-between gap-2 mb-3 sm:mb-3.5">
                <span class="entry-index font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground">${escapeHtml(item.index)}</span>
              </div>
              <h3 class="card-title text-lg sm:text-[19px] font-semibold tracking-tight text-foreground m-0 mb-2">${escapeHtml(item.name)}</h3>
              <p class="card-detail text-sm sm:text-[14.5px] text-muted-foreground leading-relaxed flex-1 m-0 mb-4">${escapeHtml(item.desc)}</p>
              ${item.link && isSafePublicUrl(item.link.url) ? `
                <div class="card-action-wrap mt-auto pt-3.5 border-t border-border">
                  <a href="${escapeHtml(item.link.url)}" ${item.link.isExternal ? 'target="_blank" rel="noopener noreferrer"' : ''} class="entry-link inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-foreground/80 transition-colors no-underline group">
                    <span>${escapeHtml(item.link.text)}</span>
                  </a>
                </div>
              ` : ''}
            </article>
          `)
          .join('');
      }
    }

    if (Array.isArray(aboutData.mediaEntries) && aboutData.mediaEntries.length > 0) {
      const mediaList = aboutPageEl.querySelector<HTMLElement>('.media-cards-list');
      if (mediaList) {
        const visibleMedia = aboutData.mediaEntries.filter((m: any) => m.visible !== false);
        mediaList.innerHTML = visibleMedia
          .map((m: any) => `
            <article class="media-feature-card rounded-xl border border-border bg-card text-card-foreground shadow-xs hover:border-border-strong transition-all p-5 sm:p-6 md:p-7 space-y-3">
              <div class="media-card-header">
                <div class="media-badge-group flex items-center gap-2 flex-wrap">
                  <span class="card-role-badge media-role-badge inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono font-medium border border-border bg-secondary text-muted-foreground">${escapeHtml(m.role)}</span>
                  <span class="media-format-tag inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-medium text-muted-foreground">${escapeHtml(m.format || 'Featured Interview')}</span>
                </div>
              </div>
              <div class="media-card-body space-y-2">
                <h3 class="media-show-title text-lg sm:text-[19px] font-semibold tracking-tight text-foreground m-0">${escapeHtml(m.show)}</h3>
                <p class="media-show-desc text-sm sm:text-base text-muted-foreground leading-relaxed m-0 max-w-2xl">${escapeHtml(m.desc)}</p>
              </div>
            </article>
          `)
          .join('');
      }
    }

    if (Array.isArray(aboutData.educationEntries) && aboutData.educationEntries.length > 0) {
      const eduGrid = aboutPageEl.querySelector<HTMLElement>('.education-grid');
      if (eduGrid) {
        const visibleEdu = aboutData.educationEntries.filter((e: any) => e.visible !== false);
        eduGrid.innerHTML = visibleEdu
          .map((edu: any) => `
            <article class="entry-card education-card rounded-xl border border-border bg-card text-card-foreground shadow-xs hover:border-border-strong transition-all p-5 sm:p-6 flex flex-col space-y-2.5 h-full">
              <div class="card-top-bar flex items-center justify-between gap-2">
                <span class="entry-index font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground">${escapeHtml(edu.index)}</span>
                ${edu.period ? `<span class="edu-period-tag text-xs font-mono text-muted-foreground">${escapeHtml(edu.period)}</span>` : ''}
              </div>
              <h3 class="card-title text-lg font-semibold tracking-tight text-foreground m-0">${escapeHtml(edu.title)}</h3>
              ${edu.degree ? `<p class="edu-degree-line text-sm font-medium text-foreground m-0">${escapeHtml(edu.degree)}</p>` : ''}
              ${edu.institution ? `<p class="edu-institution-line text-xs text-muted-foreground m-0">${escapeHtml(edu.institution)}</p>` : ''}
              ${edu.desc ? `<p class="card-detail text-sm text-muted-foreground leading-relaxed m-0 flex-1">${escapeHtml(edu.desc)}</p>` : ''}
              ${edu.status ? `<div class="edu-status-wrap inline-flex items-center gap-1.5 pt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-auto"><span class="status-pulse-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span><span class="status-text">${escapeHtml(edu.status)}</span></div>` : ''}
            </article>
          `)
          .join('');
      }
    }

    if (Array.isArray(aboutData.experienceEntries)) {
      const visibleExp = aboutData.experienceEntries.filter((e: any) => e && e.visible !== false);
      const isExpSectionVisible = aboutData.sectionVisibility?.experience !== false;
      let expSection = aboutPageEl.querySelector<HTMLElement>('.about-experience-section');

      if (!isExpSectionVisible || visibleExp.length === 0) {
        if (expSection) {
          expSection.style.display = 'none';
        }
      } else {
        const cardsHtml = visibleExp
          .map((exp: any, eIdx: number) => `
            <article class="entry-card experience-card rounded-xl border border-border bg-card text-card-foreground shadow-xs hover:border-border-strong transition-all p-5 sm:p-6 flex flex-col space-y-2.5 h-full">
              <div class="card-top-bar flex items-center justify-between gap-2">
                <span class="entry-index font-mono text-xs font-semibold px-2 py-0.5 rounded-md border border-border bg-secondary text-muted-foreground">${escapeHtml(String(eIdx + 1).padStart(2, '0'))}</span>
                ${exp.period ? `<span class="exp-period-tag text-xs font-mono text-muted-foreground">${escapeHtml(exp.period)}</span>` : ''}
              </div>
              <h3 class="card-title text-lg font-semibold tracking-tight text-foreground m-0">${escapeHtml(exp.position)}</h3>
              <p class="exp-org-line text-sm font-medium text-foreground m-0">${escapeHtml(exp.organization)}</p>
              ${exp.desc ? `<p class="card-detail text-sm text-muted-foreground leading-relaxed m-0 flex-1">${escapeHtml(exp.desc)}</p>` : ''}
              ${exp.status ? `<div class="exp-status-wrap inline-flex items-center gap-1.5 pt-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-auto"><span class="status-pulse-dot w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true"></span><span class="status-text">${escapeHtml(exp.status)}</span></div>` : ''}
            </article>
          `)
          .join('');

        if (expSection) {
          expSection.style.display = '';
          const expGrid = expSection.querySelector<HTMLElement>('.experience-grid');
          if (expGrid) expGrid.innerHTML = cardsHtml;
        } else {
          expSection = document.createElement('section');
          expSection.className = 'about-section about-experience-section space-y-4 sm:space-y-5';
          expSection.setAttribute('aria-labelledby', 'experience-heading');
          expSection.innerHTML = `
            <div class="section-header">
              <h2 id="experience-heading" class="section-title text-2xl sm:text-[28px] font-semibold tracking-tight text-foreground m-0">Experience</h2>
            </div>
            <div class="cards-grid experience-grid grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">${cardsHtml}</div>
          `;
          const sep = document.createElement('div');
          sep.className = 'h-px bg-border w-full';
          sep.setAttribute('role', 'separator');
          const contactSection = aboutPageEl.querySelector<HTMLElement>('.about-contact-section');
          if (contactSection) {
            contactSection.before(expSection, sep);
          } else {
            aboutPageEl.append(expSection, sep);
          }
        }
      }
    }
  } catch (err) {
    console.warn('[LiveSync] Error syncing About page:', err);
  }
}

/**
 * 7. Synchronize Global Site Settings (Header, Footer, Contact Email, Social Links)
 */
async function syncGlobalSiteSettings(db: any) {
  try {
    let settings = getCached<any>(CACHE_KEY_SETTINGS);
    if (!settings) {
      const snap = await getDoc(doc(db, 'siteSettings', 'general'));
      if (snap.exists()) {
        settings = snap.data();
        setCached(CACHE_KEY_SETTINGS, settings);
      }
    }
    if (!settings) return;

    if (settings.email) {
      document.querySelectorAll<HTMLAnchorElement>('.footer-email, .email-cta-btn, .header-contact-link, .mobile-nav-contact').forEach((el) => {
        el.href = `mailto:${settings.email}`;
        if (el.classList.contains('footer-email') || el.classList.contains('email-cta-btn')) {
          const span = el.querySelector('span');
          if (span) span.textContent = settings.email;
        }
      });
    }

    if (settings.websiteTitle && settings.websiteTitle !== 'Aakash Das') {
      document.title = settings.websiteTitle;
    }

    if (settings.websiteTitle) {
      document.querySelectorAll<HTMLMetaElement>('meta[name="title"], meta[property="og:title"], meta[property="twitter:title"]').forEach((el) => {
        el.content = settings.websiteTitle;
      });
    }

    if (settings.shortDescription) {
      document.querySelectorAll<HTMLMetaElement>('meta[name="description"], meta[property="og:description"], meta[property="twitter:description"]').forEach((el) => {
        el.content = settings.shortDescription;
      });
    }

    if (settings.fullName) {
      document.querySelectorAll<HTMLElement>('.brand-name').forEach((el) => {
        el.textContent = settings.fullName;
      });
      const authorMeta = document.querySelector<HTMLMetaElement>('meta[name="author"]');
      if (authorMeta) authorMeta.content = settings.fullName;
      const siteNameMeta = document.querySelector<HTMLMetaElement>('meta[property="og:site_name"]');
      if (siteNameMeta) siteNameMeta.content = settings.fullName;
    }

    if (isSafePublicUrl(settings.profileImage)) {
      if (!settings.profileImage.startsWith('data:')) {
        const ogImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]');
        if (ogImage) {
          ogImage.content = settings.profileImage.startsWith('/')
            ? `${window.location.origin}${settings.profileImage}`
            : settings.profileImage;
        }
      }
      const heroImg = document.querySelector<HTMLImageElement>('.hero-portrait-img');
      if (heroImg && (!heroImg.getAttribute('src') || heroImg.getAttribute('src') === '/images/aakash-das.webp')) {
        heroImg.src = settings.profileImage;
      }
    }

    if (isSafePublicUrl(settings.favicon) && settings.favicon !== '/favicon.svg') {
      document.querySelectorAll<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"], link[rel="shortcut icon"]').forEach((el) => {
        el.href = settings.favicon;
      });
    }

    if (Array.isArray(settings.socialLinks) && settings.socialLinks.length > 0) {
      const visibleLinks = settings.socialLinks.filter(
        (s: any) => s && s.visible !== false && isSafePublicUrl(s.url)
      );
      const footerSocial = document.querySelector<HTMLElement>('.footer-social-links');
      if (footerSocial && visibleLinks.length > 0) {
        footerSocial.innerHTML = visibleLinks
          .map((social: any) => {
            const label =
              String(social.platform || '').includes('X') || String(social.platform || '').includes('Twitter')
                ? 'X'
                : social.platform || social.label || 'Link';
            return `
              <a
                href="${escapeHtml(social.url)}"
                target="_blank"
                rel="noopener noreferrer"
                class="footer-social-link inline-flex items-center gap-1 text-xs sm:text-[13px] font-medium text-muted-foreground hover:text-foreground px-2.5 py-1.5 rounded-md hover:bg-secondary transition-colors no-underline whitespace-nowrap"
                aria-label="${escapeHtml(social.platform)} (@${escapeHtml(social.handle || '')})"
              >
                <span>${escapeHtml(label)}</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground/70"><path d="M7 7h10v10"></path><path d="M7 17 17 7"></path></svg>
              </a>
            `;
          })
          .join('');
      }
    }

    if (settings.phone) {
      const callBtn = document.querySelector<HTMLAnchorElement>('a[aria-label="Call me"]');
      if (callBtn) {
        callBtn.href = `tel:${String(settings.phone).replace(/\s+/g, '')}`;
      }
    }

    if (settings.whatsappNumber) {
      const waBtn = document.querySelector<HTMLAnchorElement>('a[aria-label="WhatsApp"]');
      if (waBtn) {
        const cleanWa = String(settings.whatsappNumber).includes('X')
          ? settings.whatsappNumber
          : String(settings.whatsappNumber).replace(/\D/g, '');
        waBtn.href = `https://wa.me/${cleanWa}`;
      }
    }
  } catch (err) {
    console.warn('[LiveSync] Error syncing global site settings:', err);
  }
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

  // Global site settings sync across all public routes
  syncGlobalSiteSettings(db);

  // Route-specific live synchronization
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
  } else if (pathname === '/about') {
    syncAboutPage(db);
  } else if (pathname === '/') {
    syncHomepage(db);
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
