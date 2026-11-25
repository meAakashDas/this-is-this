import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
  ExternalHyperlink,
  ImageRun,
  AlignmentType,
} from 'docx';
import type { NormalizedResourceDocument } from './documentExport';

export interface DocxImageAsset {
  data: Uint8Array;
  type: 'png' | 'jpg' | 'gif';
  width?: number;
  height?: number;
}

const BORDER_STYLE = {
  style: BorderStyle.SINGLE,
  size: 1,
  color: 'E4E4E7',
};

const TABLE_BORDERS = {
  top: BORDER_STYLE,
  bottom: BORDER_STYLE,
  left: BORDER_STYLE,
  right: BORDER_STYLE,
  insideHorizontal: BORDER_STYLE,
  insideVertical: BORDER_STYLE,
};

function decodeBase64ToUint8Array(b64: string): Uint8Array {
  if (typeof atob === 'function') {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) {
      out[i] = bin.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}

function decodeDataImageUri(url: string): DocxImageAsset | null {
  const match = /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/i.exec(url.trim());
  if (!match) return null;
  const rawType = match[1].toLowerCase();
  const type: 'png' | 'jpg' | 'gif' = rawType === 'jpeg' || rawType === 'jpg' ? 'jpg' : rawType === 'gif' ? 'gif' : 'png';
  try {
    return {
      data: decodeBase64ToUint8Array(match[2]),
      type,
      width: 460,
      height: 280,
    };
  } catch {
    return null;
  }
}

function unwrapInlineItems(content: any): any[] {
  if (!content) return [];
  if (Array.isArray(content)) return content;
  if (typeof content === 'object' && Array.isArray(content.content)) return content.content;
  return [];
}

function inlineToText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  return unwrapInlineItems(content)
    .map((item: any) => {
      if (typeof item === 'string') return item;
      if (!item || typeof item !== 'object') return '';
      if (item.type === 'link') {
        return Array.isArray(item.content) ? inlineToText(item.content) : item.text || item.href || '';
      }
      if (Array.isArray(item.content)) return inlineToText(item.content);
      return item.text || '';
    })
    .join('');
}

function buildInlineRuns(
  content: any,
  defaults?: { size?: number; bold?: boolean; italics?: boolean; color?: string }
): Array<TextRun | ExternalHyperlink> {
  if (!content) return [];
  if (typeof content === 'string') {
    return content
      ? [
          new TextRun({
            text: content,
            size: defaults?.size ?? 22,
            bold: defaults?.bold,
            italics: defaults?.italics,
            color: defaults?.color,
          }),
        ]
      : [];
  }

  const items = unwrapInlineItems(content);
  const runs: Array<TextRun | ExternalHyperlink> = [];

  for (const item of items) {
    if (typeof item === 'string') {
      if (item) {
        runs.push(
          new TextRun({
            text: item,
            size: defaults?.size ?? 22,
            bold: defaults?.bold,
            italics: defaults?.italics,
            color: defaults?.color,
          })
        );
      }
      continue;
    }
    if (!item || typeof item !== 'object') continue;

    if (item.type === 'link') {
      const linkLabel = inlineToText(item.content || item.text || item.href || '');
      const href = typeof item.href === 'string' && /^https?:\/\//i.test(item.href.trim())
        ? item.href.trim()
        : '';
      if (href && linkLabel) {
        runs.push(
          new ExternalHyperlink({
            link: href,
            children: [
              new TextRun({
                text: linkLabel,
                size: defaults?.size ?? 22,
                color: '0969DA',
                underline: {},
              }),
            ],
          })
        );
      } else if (linkLabel) {
        runs.push(new TextRun({ text: linkLabel, size: defaults?.size ?? 22 }));
      }
      continue;
    }

    const styles = item.styles || {};
    const text = item.text || '';
    if (!text) continue;
    runs.push(
      new TextRun({
        text,
        size: defaults?.size ?? 22,
        bold: Boolean(defaults?.bold || styles.bold),
        italics: Boolean(defaults?.italics || styles.italic),
        underline: styles.underline ? {} : undefined,
        strike: Boolean(styles.strike),
        font: styles.code ? 'Consolas' : undefined,
        color: defaults?.color || (styles.code ? '111827' : undefined),
      })
    );
  }

  return runs;
}

function renderBlockNoteBlocksToDocx(
  blocks: any[],
  children: Array<Paragraph | Table>,
  inlineImages?: Record<string, DocxImageAsset>,
  depth: number = 0
): void {
  let orderedCounter = 0;
  const baseIndent = depth * 360;

  for (const block of blocks) {
    if (!block || typeof block !== 'object') continue;

    if (block.type === 'numberedListItem') {
      orderedCounter += 1;
    } else {
      orderedCounter = 0;
    }

    switch (block.type) {
      case 'heading': {
        const level = Number(block.props?.level) || 2;
        const headingLevel =
          level === 1
            ? HeadingLevel.HEADING_1
            : level === 2
              ? HeadingLevel.HEADING_2
              : HeadingLevel.HEADING_3;
        const text = inlineToText(block.content);
        if (text.trim()) {
          children.push(
            new Paragraph({
              text,
              heading: headingLevel,
              spacing: { before: 240, after: 120 },
            })
          );
        }
        break;
      }

      case 'paragraph': {
        const runs = buildInlineRuns(block.content);
        if (runs.length > 0) {
          children.push(
            new Paragraph({
              children: runs,
              spacing: { after: 140 },
              indent: baseIndent > 0 ? { left: baseIndent } : undefined,
            })
          );
        }
        break;
      }

      case 'quote': {
        const runs = buildInlineRuns(block.content, { italics: true, bold: true });
        if (runs.length > 0) {
          children.push(
            new Paragraph({
              children: runs,
              spacing: { before: 160, after: 160 },
              indent: { left: 720 + baseIndent },
              border: {
                left: { style: BorderStyle.SINGLE, size: 12, color: '18181B', space: 12 },
              },
            })
          );
        }
        break;
      }

      case 'callout': {
        const title = block.props?.title ? String(block.props.title) : 'Note';
        const runs = buildInlineRuns(block.content, { color: '3F3F46' });
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: `[${title}] `, bold: true, color: '18181B' }),
              ...runs,
            ],
            spacing: { before: 160, after: 160 },
            indent: { left: 360 + baseIndent },
            shading: { fill: 'F4F4F5' },
          })
        );
        break;
      }

      case 'bulletListItem': {
        const runs = buildInlineRuns(block.content);
        if (runs.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: '• ' }), ...runs],
              spacing: { after: 80 },
              indent: { left: 360 + baseIndent },
            })
          );
        }
        break;
      }

      case 'numberedListItem': {
        const runs = buildInlineRuns(block.content);
        if (runs.length > 0) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: `${orderedCounter}. `, bold: true }), ...runs],
              spacing: { after: 80 },
              indent: { left: 360 + baseIndent },
            })
          );
        }
        break;
      }

      case 'checkListItem': {
        const checked = Boolean(block.props?.checked);
        const runs = buildInlineRuns(block.content);
        if (runs.length > 0) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: checked ? '☑ ' : '☐ ',
                  bold: true,
                  color: checked ? '059669' : '71717A',
                }),
                ...runs,
              ],
              spacing: { after: 80 },
              indent: { left: 360 + baseIndent },
            })
          );
        }
        break;
      }

      case 'codeBlock': {
        const codeText = inlineToText(block.content);
        if (codeText) {
          for (const line of codeText.split('\n')) {
            children.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: line || ' ',
                    font: 'Consolas',
                    size: 19,
                    color: '18181B',
                  }),
                ],
                shading: { fill: 'F4F4F5' },
                spacing: { after: 40 },
                indent: { left: 240 + baseIndent },
              })
            );
          }
        }
        break;
      }

      case 'divider': {
        children.push(
          new Paragraph({
            text: '',
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E4E4E7' },
            },
            spacing: { before: 160, after: 160 },
          })
        );
        break;
      }

      case 'image': {
        const imgUrl = typeof block.props?.url === 'string' ? block.props.url.trim() : '';
        const caption = typeof block.props?.caption === 'string' ? block.props.caption.trim() : '';
        const asset =
          (imgUrl && inlineImages?.[imgUrl]) || (imgUrl ? decodeDataImageUri(imgUrl) : null);

        if (asset) {
          try {
            children.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: asset.data,
                    transformation: {
                      width: asset.width || 460,
                      height: asset.height || 260,
                    },
                    type: asset.type,
                  }),
                ],
                spacing: { before: 140, after: caption ? 60 : 160 },
              })
            );
          } catch {
            // Fallback link/caption if binary image decode fails
          }
        } else if (imgUrl && /^https?:\/\//i.test(imgUrl)) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({ text: '[Image] ', bold: true, color: '71717A' }),
                new ExternalHyperlink({
                  link: imgUrl,
                  children: [new TextRun({ text: caption || imgUrl, color: '0969DA', underline: {} })],
                }),
              ],
              spacing: { before: 100, after: 120 },
            })
          );
        }

        if (caption) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: caption, italics: true, size: 18, color: '71717A' })],
              spacing: { after: 140 },
            })
          );
        }
        break;
      }

      case 'table': {
        const rows = Array.isArray(block.content?.rows) ? block.content.rows : [];
        if (rows.length > 0) {
          const tableRows: TableRow[] = [];
          rows.forEach((row: any, rowIdx: number) => {
            const cells = Array.isArray(row?.cells) ? row.cells : [];
            if (cells.length === 0) return;
            const isHeader = rowIdx === 0;
            const colWidth = Math.max(10, Math.floor(100 / cells.length));

            tableRows.push(
              new TableRow({
                tableHeader: isHeader,
                children: cells.map((cell: any, cellIdx: number) => {
                  const runs = buildInlineRuns(cell, {
                    size: 20,
                    bold: isHeader || cellIdx === 0,
                  });
                  return new TableCell({
                    shading: isHeader
                      ? { fill: 'F4F4F5' }
                      : cellIdx === 0
                        ? { fill: 'FAFAFA' }
                        : undefined,
                    children: [
                      new Paragraph({
                        children: runs.length > 0 ? runs : [new TextRun({ text: '', size: 20 })],
                      }),
                    ],
                    width: {
                      size: colWidth,
                      type: WidthType.PERCENTAGE,
                    },
                  });
                }),
              })
            );
          });

          if (tableRows.length > 0) {
            children.push(
              new Table({
                rows: tableRows,
                borders: TABLE_BORDERS,
                width: { size: 100, type: WidthType.PERCENTAGE },
              })
            );
          }
        }
        break;
      }

      default: {
        const runs = buildInlineRuns(block.content);
        if (runs.length > 0) {
          children.push(new Paragraph({ children: runs, spacing: { after: 120 } }));
        }
        break;
      }
    }

    if (Array.isArray(block.children) && block.children.length > 0) {
      renderBlockNoteBlocksToDocx(block.children, children, inlineImages, depth + 1);
    }
  }
}

export function generateResourceDocx(
  doc: NormalizedResourceDocument,
  thumbnailBytes?: Uint8Array,
  inlineImages?: Record<string, DocxImageAsset>
): Document {
  const children: Array<Paragraph | Table> = [];

  // =========================================================================
  // Document Header / Title
  // =========================================================================

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `NO. ${doc.resourceNumber}`,
          bold: true,
          font: 'Consolas',
          size: 18, // 9pt
          color: '52525B',
        }),
      ],
      spacing: { before: 100, after: 100 },
    })
  );

  children.push(
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 140 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Published ${doc.publishedAt} | AakashDas.live Educational Archive | `,
          font: 'Consolas',
          size: 18,
          color: '71717A',
        }),
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: doc.canonicalUrl,
              font: 'Consolas',
              size: 18,
              color: '0969DA',
              underline: {},
            }),
          ],
          link: doc.canonicalUrl,
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // =========================================================================
  // 1. About Resource Section (only when description is meaningful & distinct)
  // =========================================================================
  const hasMeaningfulDesc =
    Boolean(doc.description?.trim()) &&
    doc.description.trim().toLowerCase() !== doc.title.trim().toLowerCase() &&
    !/^resource #\d+$/i.test(doc.description.trim());

  if (hasMeaningfulDesc) {
    children.push(
      new Paragraph({
        text: 'About Resource',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 140 },
      })
    );

    children.push(
      new Paragraph({
        text: doc.description,
        spacing: { after: 240 },
      })
    );
  }

  // =========================================================================
  // 2. Downloadable Resources Section (Manual Attachments)
  // =========================================================================
  if (doc.attachments && doc.attachments.length > 0) {
    children.push(
      new Paragraph({
        text: 'Downloadable Resources',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      })
    );

    children.push(
      new Paragraph({
        text: 'The following downloadable resources and working files accompany this publication. Click any link to download directly:',
        spacing: { after: 160 },
      })
    );

    for (const att of doc.attachments) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `• ${att.name}`,
              bold: true,
            }),
            new TextRun({
              text: ` [File type: ${att.format} | Size: ${att.fileSize}]`,
              color: '52525B',
              italics: true,
            }),
          ],
          spacing: { before: 80, after: 40 },
          indent: { left: 360 },
        })
      );

      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '  Download link: ', color: '71717A' }),
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: att.url,
                  color: '0969DA',
                  underline: {},
                }),
              ],
              link: att.url,
            }),
          ],
          spacing: { after: 120 },
          indent: { left: 360 },
        })
      );
    }
  }

  // =========================================================================
  // 3. Read Me / Document Canvas Content (Single Source of Truth)
  // =========================================================================
  children.push(
    new Paragraph({
      text: 'Read Me',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 140 },
    })
  );

  // Only emit legacy summaryPoints / targetAudience if Document Canvas blocks are absent
  if (doc.summaryPoints && doc.summaryPoints.length > 0) {
    children.push(
      new Paragraph({
        text: 'What’s Included',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 180, after: 100 },
      })
    );
    for (const point of doc.summaryPoints) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: '✓ ', bold: true, color: '059669' }),
            new TextRun(point),
          ],
          spacing: { after: 80 },
          indent: { left: 360 },
        })
      );
    }
  }

  if (doc.targetAudience) {
    children.push(
      new Paragraph({
        text: 'Intended For',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        text: doc.targetAudience,
        spacing: { after: 200 },
      })
    );
  }

  if (doc.blocknoteJson && Array.isArray(doc.blocknoteJson) && doc.blocknoteJson.length > 0) {
    renderBlockNoteBlocksToDocx(doc.blocknoteJson, children, inlineImages);
  } else {
    for (const block of doc.contentBlocks) {
      if (block.type === 'heading') {
        const headingLevel =
          block.level === 1
            ? HeadingLevel.HEADING_1
            : block.level === 2
              ? HeadingLevel.HEADING_2
              : HeadingLevel.HEADING_3;
        children.push(
          new Paragraph({
            text: block.text,
            heading: headingLevel,
            spacing: { before: 240, after: 120 },
          })
        );
      } else if (block.type === 'paragraph') {
        children.push(
          new Paragraph({
            text: block.text,
            spacing: { after: 140 },
          })
        );
      } else if (block.type === 'blockquote') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `"${block.text}"`,
                italics: true,
                bold: true,
              }),
              block.caption
                ? new TextRun({
                    text: ` — ${block.caption}`,
                    italics: true,
                    color: '71717A',
                  })
                : new TextRun(''),
            ],
            spacing: { before: 160, after: 160 },
            indent: { left: 720 },
          })
        );
      } else if (block.type === 'bulletList' && block.items) {
        for (const item of block.items) {
          children.push(
            new Paragraph({
              text: `• ${item}`,
              spacing: { after: 80 },
              indent: { left: 360 },
            })
          );
        }
      } else if (block.type === 'orderedList' && block.items) {
        block.items.forEach((item, idx) => {
          children.push(
            new Paragraph({
              text: `${idx + 1}. ${item}`,
              spacing: { after: 80 },
              indent: { left: 360 },
            })
          );
        });
      } else if (block.type === 'callout') {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `[${block.title || 'Note'}] `,
                bold: true,
                color: '18181B',
              }),
              new TextRun({
                text: block.text,
                color: '3F3F46',
              }),
            ],
            spacing: { before: 160, after: 160 },
            indent: { left: 360 },
          })
        );
      } else if (block.type === 'separator') {
        children.push(
          new Paragraph({
            text: '',
            border: {
              bottom: { style: BorderStyle.SINGLE, size: 6, color: 'E4E4E7' },
            },
            spacing: { before: 160, after: 160 },
          })
        );
      } else if (block.type === 'image') {
        const asset = (block.src && inlineImages?.[block.src]) || (block.src ? decodeDataImageUri(block.src) : null);
        if (asset) {
          children.push(
            new Paragraph({
              children: [
                new ImageRun({
                  data: asset.data,
                  transformation: { width: asset.width || 460, height: asset.height || 260 },
                  type: asset.type,
                }),
              ],
              spacing: { before: 140, after: 140 },
            })
          );
        }
      } else if (block.type === 'table') {
        if (block.caption) {
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: block.caption,
                  italics: true,
                  color: '71717A',
                }),
              ],
              spacing: { before: 180, after: 80 },
            })
          );
        }

        const tableRows: TableRow[] = [];

        if (block.headers) {
          tableRows.push(
            new TableRow({
              tableHeader: true,
              children: block.headers.map(
                (h) =>
                  new TableCell({
                    shading: { fill: 'F4F4F5' },
                    children: [
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: h,
                            bold: true,
                            size: 20, // 10pt
                          }),
                        ],
                      }),
                    ],
                    width: {
                      size: Math.floor(100 / block.headers.length),
                      type: WidthType.PERCENTAGE,
                    },
                  })
              ),
            })
          );
        }

        if (block.rows) {
          for (const row of block.rows) {
            tableRows.push(
              new TableRow({
                children: row.map(
                  (cell, cellIdx) =>
                    new TableCell({
                      shading: cellIdx === 0 ? { fill: 'FAFAFA' } : undefined,
                      children: [
                        new Paragraph({
                          children: [
                            new TextRun({
                              text: cell,
                              bold: cellIdx === 0,
                              size: 20, // 10pt
                            }),
                          ],
                        }),
                      ],
                      width: {
                        size: Math.floor(100 / row.length),
                        type: WidthType.PERCENTAGE,
                      },
                    })
                ),
              })
            );
          }
        }

        children.push(
          new Table({
            rows: tableRows,
            borders: TABLE_BORDERS,
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
          })
        );
      }
    }
  }

  // =========================================================================
  // 4. Video Walkthrough Section (YouTube Integration)
  // =========================================================================
  if (doc.youtube) {
    children.push(
      new Paragraph({
        text: 'Video Walkthrough',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 280, after: 120 },
      })
    );

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Title: ', bold: true }),
          new TextRun(doc.youtube.title),
        ],
        spacing: { after: 80 },
      })
    );

    if (doc.youtube.caption) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: 'Overview: ', bold: true }),
            new TextRun({ text: doc.youtube.caption, color: '52525B' }),
          ],
          spacing: { after: 140 },
        })
      );
    }

    if (thumbnailBytes) {
      try {
        children.push(
          new Paragraph({
            children: [
              new ExternalHyperlink({
                children: [
                  new ImageRun({
                    data: thumbnailBytes,
                    transformation: { width: 360, height: 202 },
                    type: 'png',
                  }),
                ],
                link: doc.youtube.watchUrl,
              }),
            ],
            spacing: { before: 100, after: 100 },
          })
        );
      } catch (err) {
        console.warn('Could not embed thumbnail in DOCX, skipping image:', err);
      }
    }

    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: '▶ Watch Video on YouTube: ', bold: true }),
          new ExternalHyperlink({
            children: [
              new TextRun({
                text: doc.youtube.watchUrl,
                color: '0969DA',
                underline: {},
              }),
            ],
            link: doc.youtube.watchUrl,
          }),
        ],
        spacing: { after: 240 },
      })
    );
  }

  // =========================================================================
  // 5. Minimal Personal Branding & Verified Channels
  // =========================================================================
  children.push(
    new Paragraph({
      text: 'About the Author & Verified Profiles',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 300, after: 120 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Author: ${doc.author.name} • Open Educational Resources Archive`,
          bold: true,
        }),
      ],
      spacing: { after: 60 },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun('Website: '),
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: doc.author.website,
              color: '0969DA',
              underline: {},
            }),
          ],
          link: doc.author.website,
        }),
      ],
      spacing: { after: 120 },
    })
  );

  if (doc.author.socialLinks && doc.author.socialLinks.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Verified Social Profiles: ',
            bold: true,
            color: '52525B',
          }),
        ],
        spacing: { after: 80 },
      })
    );

    for (const social of doc.author.socialLinks) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `• ${social.platform}: ` }),
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: social.url,
                  color: '0969DA',
                  underline: {},
                }),
              ],
              link: social.url,
            }),
          ],
          spacing: { after: 40 },
          indent: { left: 360 },
        })
      );
    }
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Calibri',
            size: 22, // 11pt
            color: '18181B',
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: `${doc.author.name} • Resource #${doc.resourceNumber}`,
                    size: 18,
                    color: '71717A',
                    font: 'Calibri',
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${doc.author.name} • `,
                    size: 18,
                    color: '71717A',
                  }),
                  new ExternalHyperlink({
                    children: [
                      new TextRun({
                        text: doc.author.website,
                        size: 18,
                        color: '0969DA',
                      }),
                    ],
                    link: doc.author.website,
                  }),
                  new TextRun({
                    text: ' • Page ',
                    size: 18,
                    color: '71717A',
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    color: '71717A',
                  }),
                  new TextRun({
                    text: ' of ',
                    size: 18,
                    color: '71717A',
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    color: '71717A',
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}
