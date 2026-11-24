import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import { resourcesData } from '../src/data/resources.ts';

const outputDir = path.resolve('public/downloads');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const pdfFilenames = {
  '001': 'starter-budget-template-001.pdf',
  '002': 'nepal-banking-checklist-002.pdf',
  '003': 'student-productivity-tracker-003.pdf',
};

function renderResourceToHtml(resource) {
  let contentHtml = '';

  if (resource.summaryPoints && resource.summaryPoints.length > 0) {
    contentHtml += `
      <div class="section-block">
        <h3>What’s Included</h3>
        <ul>
          ${resource.summaryPoints.map((pt) => `<li>${pt}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (resource.targetAudience) {
    contentHtml += `
      <div class="section-block">
        <h3>Intended For</h3>
        <p>${resource.targetAudience}</p>
      </div>
    `;
  }

  if (resource.contentBlocks && resource.contentBlocks.length > 0) {
    for (const block of resource.contentBlocks) {
      if (block.type === 'heading') {
        const tag = block.level === 1 ? 'h2' : block.level === 2 ? 'h3' : 'h4';
        contentHtml += `<${tag}>${block.text}</${tag}>`;
      } else if (block.type === 'paragraph') {
        contentHtml += `<p>${block.text}</p>`;
      } else if (block.type === 'blockquote') {
        contentHtml += `
          <blockquote>
            <p>"${block.text}"</p>
            ${block.caption ? `<cite>— ${block.caption}</cite>` : ''}
          </blockquote>
        `;
      } else if (block.type === 'bulletList') {
        contentHtml += `
          <ul>
            ${block.items.map((it) => `<li>${it}</li>`).join('')}
          </ul>
        `;
      } else if (block.type === 'orderedList') {
        contentHtml += `
          <ol>
            ${block.items.map((it) => `<li>${it}</li>`).join('')}
          </ol>
        `;
      } else if (block.type === 'callout') {
        contentHtml += `
          <div class="callout">
            <strong>${block.title ? block.title : 'Note'}:</strong> ${block.text}
          </div>
        `;
      } else if (block.type === 'table') {
        contentHtml += `
          <div class="table-wrap">
            ${block.caption ? `<div class="table-caption">${block.caption}</div>` : ''}
            <table>
              <thead>
                <tr>
                  ${(block.headers || []).map((h) => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${(block.rows || [])
                  .map(
                    (row) =>
                      `<tr>${row
                        .map((cell, idx) =>
                          idx === 0
                            ? `<th>${cell}</th>`
                            : `<td>${cell}</td>`
                        )
                        .join('')}</tr>`
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }
  }

  let downloadsHtml = '';
  if (resource.attachments && resource.attachments.length > 0) {
    downloadsHtml = `
      <div class="downloads-list">
        ${resource.attachments
          .map(
            (att) => `
          <div class="download-item">
            <span class="file-name">${att.name}</span>
            <span class="file-format">${att.format}</span>
          </div>
        `
          )
          .join('')}
      </div>
    `;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${resource.title}</title>
  <style>
    @page {
      size: A4;
      margin: 20mm 20mm 25mm 20mm;
      @bottom-right {
        content: counter(page);
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #18181b;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #e4e4e7;
      padding-bottom: 14px;
      margin-bottom: 20px;
    }
    .meta-badge {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 4px;
      background: #f4f4f5;
      border: 1px solid #d4d4d8;
      color: #52525b;
      margin-bottom: 8px;
    }
    h1 {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: -0.025em;
      margin: 0 0 6px 0;
      color: #09090b;
    }
    .date {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 11px;
      color: #71717a;
    }
    h2 {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: #09090b;
      margin-top: 24px;
      margin-bottom: 8px;
      border-bottom: 1px solid #f4f4f5;
      padding-bottom: 4px;
    }
    h3 {
      font-size: 14px;
      font-weight: 600;
      color: #18181b;
      margin-top: 18px;
      margin-bottom: 6px;
    }
    p {
      margin: 0 0 10px 0;
      color: #27272a;
    }
    ul, ol {
      margin: 6px 0 12px 20px;
      padding: 0;
      color: #27272a;
    }
    li {
      margin-bottom: 4px;
    }
    blockquote {
      margin: 14px 0;
      padding: 8px 14px;
      border-left: 3px solid #18181b;
      background: #fafafa;
      font-style: italic;
    }
    blockquote p {
      margin: 0;
      color: #09090b;
    }
    blockquote cite {
      display: block;
      font-size: 11px;
      color: #71717a;
      margin-top: 4px;
      font-style: normal;
    }
    .callout {
      margin: 14px 0;
      padding: 10px 14px;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      background: #f4f4f5;
      font-size: 12px;
    }
    .table-wrap {
      margin: 14px 0;
      page-break-inside: avoid;
    }
    .table-caption {
      font-size: 11px;
      font-style: italic;
      color: #71717a;
      margin-bottom: 4px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
      text-align: left;
    }
    th, td {
      padding: 6px 10px;
      border: 1px solid #e4e4e7;
    }
    th {
      background: #f4f4f5;
      font-weight: 600;
      color: #18181b;
    }
    .downloads-list {
      margin: 10px 0 16px 0;
      border: 1px solid #e4e4e7;
      border-radius: 6px;
      overflow: hidden;
    }
    .download-item {
      padding: 8px 12px;
      border-bottom: 1px solid #f4f4f5;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .download-item:last-child {
      border-bottom: none;
    }
    .file-name {
      font-weight: 500;
    }
    .file-format {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 10px;
      background: #e4e4e7;
      padding: 1px 6px;
      border-radius: 4px;
      color: #52525b;
    }
    .footer {
      margin-top: 30px;
      padding-top: 10px;
      border-top: 1px solid #e4e4e7;
      font-size: 10px;
      color: #a1a1aa;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="meta-badge">NO. ${resource.resourceNumber}</div>
    <h1>${resource.title}</h1>
    <div class="date">Published ${resource.publishedAt} • AakashDas.live Educational Archive</div>
  </div>

  <section>
    <h2>About Resource</h2>
    <p>${resource.description}</p>
  </section>

  ${
    downloadsHtml
      ? `
  <section>
    <h2>Download Resources</h2>
    ${downloadsHtml}
  </section>
  `
      : ''
  }

  <section>
    <h2>Read Me</h2>
    ${contentHtml}
  </section>

  <div class="footer">
    <span>AakashDas.live • Open Educational Resources Archive</span>
    <span>Resource #${resource.resourceNumber}</span>
  </div>
</body>
</html>
  `;
}

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  const published = resourcesData.filter((r) => r.published);

  for (const res of published) {
    const filename = pdfFilenames[res.resourceNumber];
    if (!filename) continue;

    const html = renderResourceToHtml(res);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    const filePath = path.join(outputDir, filename);

    await page.pdf({
      path: filePath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm',
      },
    });

    const stat = fs.statSync(filePath);
    console.log(`Generated formatted PDF: ${filePath} (${stat.size} bytes)`);
    await page.close();
  }

  await browser.close();
}

main().catch(console.error);
