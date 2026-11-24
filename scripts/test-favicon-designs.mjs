import { chromium } from 'playwright';

async function testFaviconDesigns() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });

  // Design 1: Classic Apple Squircle (dark charcoal #111) with clean geometric human bust (circle head + rounded shoulder sweep)
  const design1Svg = (size) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
      <rect x="4" y="4" width="120" height="120" rx="28" fill="#111111" stroke="#333333" stroke-width="3" />
      <circle cx="64" cy="46" r="19" fill="#FFFFFF" />
      <path d="M34 102 C34 78 47 70 64 70 C81 70 94 78 94 102 Z" fill="#FFFFFF" />
    </svg>
  `;

  // Design 2: Refined Apple Squircle with neck gap and modern geometric taper
  const design2Svg = (size) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
      <rect x="4" y="4" width="120" height="120" rx="30" fill="#121214" stroke="rgba(255,255,255,0.18)" stroke-width="3" />
      <!-- Head -->
      <circle cx="64" cy="44" r="18" fill="#FFFFFF" />
      <!-- Bust / Shoulders with smooth curve -->
      <path d="M32 100 C32 76 46 68 64 68 C82 68 96 76 96 100 C96 102 94 104 92 104 L36 104 C34 104 32 102 32 100 Z" fill="#FFFFFF" />
    </svg>
  `;

  // Design 3: Precision Profile (side-profile silhouette or minimal front facing with collar cut)
  const design3Svg = (size) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
      <rect x="4" y="4" width="120" height="120" rx="28" fill="#0A0A0B" stroke="#27272A" stroke-width="3" />
      <circle cx="64" cy="42" r="17" fill="#F4F4F5" />
      <path d="M36 98 C36 78 48 70 64 70 C80 70 92 78 92 98 C92 101 90 102 87 102 L41 102 C38 102 36 101 36 98 Z" fill="#F4F4F5" />
      <!-- Subtle interior accent line / collar accent -->
      <path d="M57 70 L64 79 L71 70" stroke="#0A0A0B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" />
    </svg>
  `;

  // Design 4: Adaptive SVG (uses prefers-color-scheme)
  // In light theme: Deep charcoal tile (#0F0F11) with white bust.
  // In dark theme: Pitch black tile (#000000) with subtle zinc border (#3F3F46) and luminous white bust.
  const design4Svg = (size) => `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="${size}" height="${size}">
      <rect class="bg" x="4" y="4" width="120" height="120" rx="28" fill="#18181B" stroke="rgba(255,255,255,0.2)" stroke-width="3" />
      <circle cx="64" cy="44" r="18" fill="#FFFFFF" />
      <path d="M33 101 C33 77 47 69 64 69 C81 69 95 77 95 101 C95 103 93 104 91 104 L37 104 C35 104 33 103 33 101 Z" fill="#FFFFFF" />
    </svg>
  `;

  const designs = [
    { id: 1, name: 'Option 1: Bold Minimal Bust', fn: design1Svg },
    { id: 2, name: 'Option 2: Refined Apple Squircle Bust', fn: design2Svg },
    { id: 3, name: 'Option 3: Bust with Subtle Collar Gap', fn: design3Svg },
    { id: 4, name: 'Option 4: Luminous Obsidian Bust', fn: design4Svg },
  ];

  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          body { background: #E5E7EB; padding: 40px; display: flex; flex-direction: column; gap: 32px; }
          h1 { font-size: 20px; font-weight: 600; color: #111; margin-bottom: 8px; }
          .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
          .card { background: #FFFFFF; border-radius: 16px; padding: 24px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
          .title { font-size: 15px; font-weight: 600; color: #111; margin-bottom: 16px; }
          .tab-row { display: flex; flex-direction: column; gap: 12px; }
          .tab { display: flex; align-items: center; gap: 16px; padding: 12px 18px; border-radius: 10px; }
          .tab-light { background: #EBECEE; border: 1px solid #D5D6D9; color: #1E2022; }
          .tab-dark { background: #202124; border: 1px solid #303134; color: #E8EAED; }
          .tab-label { font-size: 12px; font-weight: 500; width: 140px; }
          .fav-cluster { display: flex; align-items: center; gap: 24px; }
          .fav-item { display: flex; flex-direction: column; align-items: center; gap: 6px; }
          .fav-item span { font-size: 10px; opacity: 0.6; }
        </style>
      </head>
      <body>
        <div>
          <h1>Favicon Design Evaluation — Human Profile Symbol</h1>
          <p style="font-size: 13px; color: #666;">Evaluating visual recognizability, contrast, and elegance at 64px, 32px, and 16px on Light vs Dark browser tabs</p>
        </div>

        <div class="grid">
          ${designs.map(d => `
            <div class="card">
              <div class="title">${d.name}</div>
              <div class="tab-row">
                <div class="tab tab-light">
                  <div class="tab-label">Light Tab (#EBECEE)</div>
                  <div class="fav-cluster">
                    <div class="fav-item">${d.fn(64)}<span>64px</span></div>
                    <div class="fav-item">${d.fn(32)}<span>32px</span></div>
                    <div class="fav-item">${d.fn(16)}<span>16px</span></div>
                  </div>
                </div>
                <div class="tab tab-dark">
                  <div class="tab-label">Dark Tab (#202124)</div>
                  <div class="fav-cluster">
                    <div class="fav-item">${d.fn(64)}<span>64px</span></div>
                    <div class="fav-item">${d.fn(32)}<span>32px</span></div>
                    <div class="fav-item">${d.fn(16)}<span>16px</span></div>
                  </div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </body>
    </html>
  `);

  await page.screenshot({ path: 'public/screenshots/refinement/favicon-options-eval.png', fullPage: true });
  await browser.close();
  console.log('Evaluations rendered to public/screenshots/refinement/favicon-options-eval.png');
}

testFaviconDesigns().catch(console.error);
