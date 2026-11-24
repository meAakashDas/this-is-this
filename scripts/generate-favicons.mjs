import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <style>
      .tile {
        fill: #111111;
        stroke: #262626;
        stroke-width: 3px;
      }
      .silhouette {
        fill: #FFFFFF;
      }
      @media (prefers-color-scheme: dark) {
        .tile {
          fill: #09090B;
          stroke: rgba(255, 255, 255, 0.22);
          stroke-width: 3.5px;
        }
        .silhouette {
          fill: #FFFFFF;
        }
      }
    </style>
  </defs>
  <rect class="tile" x="4" y="4" width="120" height="120" rx="30" />
  <circle class="silhouette" cx="64" cy="44" r="18" />
  <path class="silhouette" d="M32 100 C32 76 46 68 64 68 C82 68 96 76 96 100 C96 102 94 104 92 104 L36 104 C34 104 32 102 32 100 Z" />
</svg>`;

// Static SVG for PNG rendering (dark tile with subtle stroke + white bust)
const staticSvgForRaster = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="100%" height="100%">
  <rect x="4" y="4" width="120" height="120" rx="30" fill="#111111" stroke="#2D2D30" stroke-width="3" />
  <circle cx="64" cy="44" r="18" fill="#FFFFFF" />
  <path d="M32 100 C32 76 46 68 64 68 C82 68 96 76 96 100 C96 102 94 104 92 104 L36 104 C34 104 32 102 32 100 Z" fill="#FFFFFF" />
</svg>`;

// Apple Touch Icon (Apple recommends squircle without pre-rounded corners if system rounds them, or pre-rendered squircle on dark background)
const appleTouchSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180" width="100%" height="100%">
  <rect width="180" height="180" fill="#111111" />
  <g transform="translate(26, 26)">
    <circle cx="64" cy="44" r="18" fill="#FFFFFF" />
    <path d="M32 100 C32 76 46 68 64 68 C82 68 96 76 96 100 C96 102 94 104 92 104 L36 104 C34 104 32 102 32 100 Z" fill="#FFFFFF" />
  </g>
</svg>`;

function createIco(images) {
  // images: array of { width, height, buffer }
  const count = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dataOffsetStart = headerSize + count * dirEntrySize;

  let currentOffset = dataOffsetStart;
  const dirEntries = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // image size
    entry.writeUInt32LE(currentOffset, 12); // image offset

    dirEntries.push(entry);
    currentOffset += img.buffer.length;
  }

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // icon type
  header.writeUInt16LE(count, 4); // count of images

  return Buffer.concat([header, ...dirEntries, ...images.map((img) => img.buffer)]);
}

async function generateFavicons() {
  console.log('1. Writing public/favicon.svg...');
  fs.writeFileSync(path.join(process.cwd(), 'public/favicon.svg'), svgContent, 'utf-8');

  console.log('2. Rendering PNG favicons via Playwright...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  // Generate 32x32 PNG
  const page32 = await browser.newPage({ viewport: { width: 32, height: 32 }, deviceScaleFactor: 1 });
  await page32.setContent(`
    <!DOCTYPE html>
    <html style="margin:0;padding:0;overflow:hidden;background:transparent;">
      <body style="margin:0;padding:0;overflow:hidden;background:transparent;width:32px;height:32px;">
        ${staticSvgForRaster}
      </body>
    </html>
  `);
  const png32Buffer = await page32.screenshot({ omitBackground: true, type: 'png' });
  fs.writeFileSync(path.join(process.cwd(), 'public/favicon-32x32.png'), png32Buffer);
  await page32.close();

  // Generate 16x16 PNG
  const page16 = await browser.newPage({ viewport: { width: 16, height: 16 }, deviceScaleFactor: 1 });
  await page16.setContent(`
    <!DOCTYPE html>
    <html style="margin:0;padding:0;overflow:hidden;background:transparent;">
      <body style="margin:0;padding:0;overflow:hidden;background:transparent;width:16px;height:16px;">
        ${staticSvgForRaster}
      </body>
    </html>
  `);
  const png16Buffer = await page16.screenshot({ omitBackground: true, type: 'png' });
  fs.writeFileSync(path.join(process.cwd(), 'public/favicon-16x16.png'), png16Buffer);
  await page16.close();

  // Generate 180x180 apple-touch-icon.png
  const page180 = await browser.newPage({ viewport: { width: 180, height: 180 }, deviceScaleFactor: 1 });
  await page180.setContent(`
    <!DOCTYPE html>
    <html style="margin:0;padding:0;overflow:hidden;background:#111111;">
      <body style="margin:0;padding:0;overflow:hidden;background:#111111;width:180px;height:180px;">
        ${appleTouchSvg}
      </body>
    </html>
  `);
  const png180Buffer = await page180.screenshot({ omitBackground: false, type: 'png' });
  fs.writeFileSync(path.join(process.cwd(), 'public/apple-touch-icon.png'), png180Buffer);
  await page180.close();

  console.log('3. Generating public/favicon.ico...');
  const icoBuffer = createIco([
    { width: 16, height: 16, buffer: png16Buffer },
    { width: 32, height: 32, buffer: png32Buffer },
  ]);
  fs.writeFileSync(path.join(process.cwd(), 'public/favicon.ico'), icoBuffer);

  await browser.close();
  console.log('Favicon generation complete!');
}

generateFavicons().catch(console.error);
