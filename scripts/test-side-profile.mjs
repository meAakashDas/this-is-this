import { chromium } from 'playwright';

async function testProfileSilhouette() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 } });

  // Front silhouette (Option 2)
  const frontSvg = (size) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
      <rect x="4" y="4" width="120" height="120" rx="30" fill="#111111" stroke="rgba(255,255,255,0.2)" stroke-width="3" />
      <circle cx="64" cy="44" r="18" fill="#FFFFFF" />
      <path d="M32 100 C32 76 46 68 64 68 C82 68 96 76 96 100 C96 102 94 104 92 104 L36 104 C34 104 32 102 32 100 Z" fill="#FFFFFF" />
    </svg>
  `;

  // Side profile silhouette (clean geometric side profile: head with nose/brow contour + neck + shoulders)
  const sideSvg = (size) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
      <rect x="4" y="4" width="120" height="120" rx="30" fill="#111111" stroke="rgba(255,255,255,0.2)" stroke-width="3" />
      <!-- Minimalist geometric side profile facing right -->
      <path d="M52 26 C64 26 73 35 73 47 C73 49 75 51 77 52 C78 52.5 79 53 79 54.5 C79 56 77 57 75 57 C73 57 72 58 72 61 C72 65 67 67 63 67 L63 71 C73 72 87 77 91 98 C91 101 89 103 86 103 L40 103 C37 103 35 101 35 98 C38 78 50 72 57 71 L57 66 C51 63 47 55 47 47 C47 35 49 26 52 26 Z" fill="#FFFFFF" />
    </svg>
  `;

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
          body { background: #E5E7EB; padding: 40px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
          .card { background: #FFF; border-radius: 16px; padding: 24px; }
          .title { font-size: 16px; font-weight: 600; margin-bottom: 16px; }
          .tab { display: flex; align-items: center; gap: 24px; padding: 16px 20px; border-radius: 10px; margin-bottom: 12px; }
          .tab-light { background: #EBECEE; border: 1px solid #D5D6D9; }
          .tab-dark { background: #202124; border: 1px solid #303134; color: #FFF; }
        </style>
      </head>
      <body>
        <div class="grid">
          <div class="card">
            <div class="title">Front Silhouette Bust (Symmetrical Geometric)</div>
            <div class="tab tab-light">
              <div>${frontSvg(64)}</div>
              <div>${frontSvg(32)}</div>
              <div>${frontSvg(16)}</div>
            </div>
            <div class="tab tab-dark">
              <div>${frontSvg(64)}</div>
              <div>${frontSvg(32)}</div>
              <div>${frontSvg(16)}</div>
            </div>
          </div>
          <div class="card">
            <div class="title">Side Profile Silhouette</div>
            <div class="tab tab-light">
              <div>${sideSvg(64)}</div>
              <div>${sideSvg(32)}</div>
              <div>${sideSvg(16)}</div>
            </div>
            <div class="tab tab-dark">
              <div>${sideSvg(64)}</div>
              <div>${sideSvg(32)}</div>
              <div>${sideSvg(16)}</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  await page.screenshot({ path: 'public/screenshots/refinement/front-vs-side-eval.png' });
  await browser.close();
}

testProfileSilhouette().catch(console.error);
