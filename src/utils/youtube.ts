/**
 * Shared YouTube URL Parsing, Validation & Rendering Utilities
 *
 * Pure, dependency-free module usable across Browser, Astro SSR,
 * Playwright PDF HTML templates, jsPDF vector generator, and DOCX generator.
 */

export const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

const ALLOWED_YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
  'youtu.be',
  'www.youtu.be',
]);

export type ParsedVideoBlock =
  | {
      kind: 'youtube';
      videoId: string;
      title?: string;
      caption?: string;
      originalUrl: string;
      watchUrl: string;
      embedUrl: string;
      thumbnailUrl: string;
    }
  | {
      kind: 'external';
      title?: string;
      caption?: string;
      originalUrl: string;
    };

export function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Normalizes a raw URL string, stripping stray trailing whitespace / `#`
 * and blocking non-HTTP(S) schemes such as javascript:, data:, or blob:.
 */
export function sanitizeHttpVideoUrl(rawUrl: unknown): string | null {
  if (typeof rawUrl !== 'string') return null;
  let trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Strip stray empty fragment suffixes observed in pasted URLs (e.g. "...?v=abc  #")
  trimmed = trimmed.replace(/\s+#*$/, '').replace(/#$/, '').trim();
  if (!trimmed) return null;

  if (/^(javascript|vbscript|data|blob):/i.test(trimmed)) {
    return null;
  }

  const withScheme = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)
    ? trimmed
    : trimmed.startsWith('//')
      ? `https:${trimmed}`
      : `https://${trimmed}`;

  try {
    const parsed = new URL(withScheme);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Extracts a validated 11-character YouTube video ID from any supported URL format:
 * - youtube.com/watch?v=VIDEO_ID
 * - youtu.be/VIDEO_ID
 * - youtube.com/embed/VIDEO_ID
 * - youtube-nocookie.com/embed/VIDEO_ID
 * - youtube.com/shorts/VIDEO_ID
 * - youtube.com/live/VIDEO_ID
 * - youtube.com/v/VIDEO_ID
 */
export function extractYouTubeVideoId(rawUrl: unknown): string | null {
  const safeUrl = sanitizeHttpVideoUrl(rawUrl);
  if (!safeUrl) return null;

  try {
    const parsed = new URL(safeUrl);
    const host = parsed.hostname.toLowerCase();
    if (!ALLOWED_YOUTUBE_HOSTS.has(host)) {
      return null;
    }

    const segments = parsed.pathname.split('/').filter(Boolean);
    let candidate = '';

    if (host === 'youtu.be' || host === 'www.youtu.be') {
      candidate = segments[0] || '';
    } else if (
      segments[0] &&
      ['embed', 'shorts', 'live', 'v'].includes(segments[0].toLowerCase())
    ) {
      candidate = segments[1] || '';
    } else if (parsed.searchParams.get('v')) {
      candidate = parsed.searchParams.get('v') || '';
    }

    candidate = candidate.trim();
    return YOUTUBE_ID_REGEX.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

function resolveMeaningfulVideoTitle(
  rawTitle: unknown,
  rawName: unknown,
  rawUrl: string,
  videoId: string | null
): string | undefined {
  const candidates = [rawTitle, rawName];
  for (const cand of candidates) {
    if (typeof cand !== 'string') continue;
    const clean = cand.trim();
    if (!clean) continue;

    // Skip BlockNote auto-generated URL stubs such as "watch?v=VIDEO_ID" or raw URLs
    const lower = clean.toLowerCase();
    if (
      lower.startsWith('http://') ||
      lower.startsWith('https://') ||
      lower.startsWith('watch?v=') ||
      clean === rawUrl.trim() ||
      (videoId && (clean === videoId || lower === `watch?v=${videoId.toLowerCase()}`))
    ) {
      continue;
    }

    return clean;
  }
  return undefined;
}

/**
 * Extracts normalized metadata from a BlockNote `video` (or custom `youtube`/`embed`) block,
 * or from a legacy ContentBlock `{ type: 'video', url, ... }`.
 * Returns `null` when URL is missing or invalid so callers never render empty black containers.
 */
export function extractVideoBlockInfo(block: any): ParsedVideoBlock | null {
  if (!block || typeof block !== 'object') return null;

  const blockType = String(block.type || '').toLowerCase();
  if (!['video', 'youtube', 'youtubeembed', 'embed'].includes(blockType)) {
    return null;
  }

  const rawUrlCandidate =
    block.props?.url ??
    block.props?.src ??
    block.props?.href ??
    block.url ??
    block.src ??
    (block.props?.videoId ? `https://www.youtube.com/watch?v=${block.props.videoId}` : undefined) ??
    (block.videoId ? `https://www.youtube.com/watch?v=${block.videoId}` : undefined);

  const originalUrl = sanitizeHttpVideoUrl(rawUrlCandidate);
  if (!originalUrl) return null;

  const videoId = extractYouTubeVideoId(originalUrl);
  const title = resolveMeaningfulVideoTitle(
    block.props?.title ?? block.title,
    block.props?.name ?? block.name,
    String(rawUrlCandidate || ''),
    videoId
  );
  const rawCaption = block.props?.caption ?? block.caption;
  const caption = typeof rawCaption === 'string' && rawCaption.trim() ? rawCaption.trim() : undefined;

  if (videoId) {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    return {
      kind: 'youtube',
      videoId,
      title,
      caption,
      originalUrl,
      watchUrl,
      embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
      thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    };
  }

  return {
    kind: 'external',
    title,
    caption,
    originalUrl,
  };
}

/**
 * Collects all valid YouTube videos embedded inline across BlockNote blocks (recursing children)
 * or ContentBlock arrays in document order.
 */
export function extractYouTubeVideosFromBlocks(
  blocks: any[] = []
): Array<Extract<ParsedVideoBlock, { kind: 'youtube' }>> {
  const results: Array<Extract<ParsedVideoBlock, { kind: 'youtube' }>> = [];

  const visit = (items: any[]) => {
    if (!Array.isArray(items)) return;
    for (const block of items) {
      if (!block || typeof block !== 'object') continue;
      const parsed = extractVideoBlockInfo(block);
      if (parsed && parsed.kind === 'youtube') {
        results.push(parsed);
      }
      if (Array.isArray(block.children) && block.children.length > 0) {
        visit(block.children);
      }
    }
  };

  visit(blocks);
  return results;
}

/**
 * Renders a validated video block into safe, semantic HTML for either:
 * - Public web pages (responsive 16:9 `youtube-nocookie.com` iframe)
 * - Static A4 Playwright PDF templates (`pdfMode: true` -> thumbnail + Watch link)
 */
export function renderVideoBlockToHtml(
  video: ParsedVideoBlock,
  options?: { pdfMode?: boolean; videoThumbnails?: Record<string, string> }
): string {
  const pdfMode = Boolean(options?.pdfMode);

  if (video.kind === 'youtube') {
    if (pdfMode) {
      const thumbSrc = options?.videoThumbnails?.[video.videoId] || video.thumbnailUrl;
      return `<div class="inline-video-card video-card my-5">
  ${video.title ? `<div class="video-info"><h4 class="video-title">${escapeHtml(video.title)}</h4>${video.caption ? `<p class="video-caption">${escapeHtml(video.caption)}</p>` : ''}</div>` : video.caption ? `<div class="video-info"><p class="video-caption">${escapeHtml(video.caption)}</p></div>` : ''}
  ${thumbSrc ? `<div class="video-thumbnail-wrap"><a href="${escapeHtml(video.originalUrl)}" target="_blank" rel="noopener" class="video-link" aria-label="Watch video on YouTube"><img src="${escapeHtml(thumbSrc)}" alt="${escapeHtml(video.title || 'YouTube video thumbnail')}" class="video-thumbnail" onerror="this.style.display='none'" /><div class="video-play-overlay"><span class="play-badge">&#9658; Watch on YouTube</span></div></a></div>` : ''}
  <div class="video-link-bar"><a href="${escapeHtml(video.originalUrl)}" target="_blank" rel="noopener" class="direct-youtube-link"><strong>Watch on YouTube &rarr;</strong></a><div class="inline-video-url"><a href="${escapeHtml(video.originalUrl)}" target="_blank" rel="noopener" class="direct-youtube-url">${escapeHtml(video.originalUrl)}</a></div></div>
</div>`;
    }

    const titleAttr = video.title || 'Embedded YouTube Video';
    return `<figure class="video-responsive-wrapper inline-video-embed w-full my-6 m-0" style="content-visibility: auto; contain-intrinsic-size: 720px 405px;">
  ${video.title ? `<div class="video-block-title text-sm font-semibold tracking-tight text-foreground mb-2">${escapeHtml(video.title)}</div>` : ''}
  <div class="video-player-box relative w-full aspect-video rounded-xl border border-border bg-black overflow-hidden shadow-xs" style="position:relative;width:100%;aspect-ratio:16/9;">
    <iframe src="${escapeHtml(video.embedUrl)}" title="${escapeHtml(titleAttr)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin" class="absolute inset-0 w-full h-full border-0" style="position:absolute;inset:0;width:100%;height:100%;border:0;"></iframe>
  </div>
  ${video.caption ? `<figcaption class="video-caption text-xs text-muted-foreground text-center mt-2">${escapeHtml(video.caption)}</figcaption>` : ''}
</figure>`;
  }

  // Graceful fallback for supported external HTTP(S) video links without empty black iframe containers
  return `<div class="inline-video-card video-external-fallback my-5 p-4 rounded-xl border border-border bg-card flex flex-col gap-1.5">
  ${video.title ? `<div class="text-sm font-semibold text-foreground">${escapeHtml(video.title)}</div>` : ''}
  ${video.caption ? `<div class="text-xs text-muted-foreground">${escapeHtml(video.caption)}</div>` : ''}
  <a href="${escapeHtml(video.originalUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs font-medium text-primary underline break-all">Watch Video &rarr; (${escapeHtml(video.originalUrl)})</a>
</div>`;
}
