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

export function generateResourceDocx(
  doc: NormalizedResourceDocument,
  thumbnailBuffer?: Buffer
): Document {
  const children: Array<Paragraph | Table> = [];

  // =========================================================================
  // Document Header / Title
  // =========================================================================

  // Resource Number Badge
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

  // Main Title
  children.push(
    new Paragraph({
      text: doc.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 140 },
    })
  );

  // Publication Meta Line
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
  // 1. About Resource Section
  // =========================================================================
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

  // =========================================================================
  // 2. Downloadable Resources Section (CRITICAL MANDATORY REQUIREMENT)
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
  // 3. Read Me Section
  // =========================================================================
  children.push(
    new Paragraph({
      text: 'Read Me',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 300, after: 140 },
    })
  );

  // What's Included (Summary Points)
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

  // Intended For (Target Audience)
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

  // Content Blocks
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

      // Header row
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

      // Data rows
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

    // Embed Clickable Thumbnail Image if buffer available
    if (thumbnailBuffer) {
      try {
        children.push(
          new Paragraph({
            children: [
              new ExternalHyperlink({
                children: [
                  new ImageRun({
                    data: thumbnailBuffer,
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

    // Direct Clickable Video URL
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

  // Build the complete document with Header and Footer
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
              top: 1440, // 1 inch
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
