import fs from 'fs';
import path from 'path';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
} from 'docx';
import { resourcesData } from '../src/data/resources.ts';

const outputDir = path.resolve('public/downloads');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function createDocxForResource(resource) {
  const children = [];

  // Title
  children.push(
    new Paragraph({
      text: resource.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    })
  );

  // Metadata
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Resource #${resource.resourceNumber} | Published: ${resource.publishedAt}`,
          italics: true,
          color: '666666',
        }),
      ],
      spacing: { after: 300 },
    })
  );

  // About Resource heading
  children.push(
    new Paragraph({
      text: 'About Resource',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 200, after: 150 },
    })
  );

  // About Resource paragraph
  children.push(
    new Paragraph({
      text: resource.description,
      spacing: { after: 200 },
    })
  );

  // Download Resources
  if (resource.attachments && resource.attachments.length > 0) {
    children.push(
      new Paragraph({
        text: 'Download Resources',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 150 },
      })
    );
    for (const att of resource.attachments) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `• ${att.name}`, bold: true }),
            new TextRun({ text: ` (${att.format})`, italics: true, color: '666666' }),
          ],
          spacing: { after: 100 },
        })
      );
    }
  }

  // Read Me section
  children.push(
    new Paragraph({
      text: 'Read Me',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 250, after: 150 },
    })
  );

  // Summary points
  if (resource.summaryPoints && resource.summaryPoints.length > 0) {
    children.push(
      new Paragraph({
        text: 'What’s Included',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 150 },
      })
    );
    for (const point of resource.summaryPoints) {
      children.push(
        new Paragraph({
          text: `• ${point}`,
          spacing: { after: 100 },
        })
      );
    }
  }

  // Target audience
  if (resource.targetAudience) {
    children.push(
      new Paragraph({
        text: 'Intended For',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );
    children.push(
      new Paragraph({
        text: resource.targetAudience,
        spacing: { after: 200 },
      })
    );
  }

  // Content blocks
  if (resource.contentBlocks) {
    for (const block of resource.contentBlocks) {
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
            spacing: { before: 250, after: 120 },
          })
        );
      } else if (block.type === 'paragraph') {
        children.push(
          new Paragraph({
            text: block.text,
            spacing: { after: 150 },
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
                    color: '777777',
                  })
                : new TextRun(''),
            ],
            spacing: { before: 150, after: 150 },
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
                text: block.title ? `[${block.title}] ` : '[Note] ',
                bold: true,
              }),
              new TextRun({
                text: block.text,
              }),
            ],
            spacing: { before: 150, after: 150 },
            indent: { left: 360 },
          })
        );
      } else if (block.type === 'table') {
        if (block.caption) {
          children.push(
            new Paragraph({
              text: block.caption,
              italics: true,
              spacing: { before: 150, after: 80 },
            })
          );
        }

        const tableRows = [];

        // Header row
        if (block.headers) {
          tableRows.push(
            new TableRow({
              tableHeader: true,
              children: block.headers.map(
                (h) =>
                  new TableCell({
                    children: [
                      new Paragraph({
                        text: h,
                        style: 'Strong',
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
                  (cell) =>
                    new TableCell({
                      children: [
                        new Paragraph({
                          text: cell,
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
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
          })
        );
      }
    }
  }

  return new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });
}

const docxFilenames = {
  '001': 'starter-budget-template-001.docx',
  '002': 'nepal-banking-checklist-002.docx',
  '003': 'student-productivity-tracker-003.docx',
};

async function main() {
  const published = resourcesData.filter((r) => r.published);

  for (const res of published) {
    const filename = docxFilenames[res.resourceNumber];
    if (!filename) continue;

    const doc = createDocxForResource(res);
    const buffer = await Packer.toBuffer(doc);
    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, buffer);
    console.log(`Generated genuine DOCX: ${filePath} (${buffer.length} bytes)`);
  }
}

main().catch(console.error);
