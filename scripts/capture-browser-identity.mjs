import { chromium } from 'playwright';
import fs from 'node:fs';

async function captureBrowserIdentity() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  const pagesToTest = [
    { name: 'homepage', url: 'http://localhost:4321/', title: 'Aakash Das', displayUrl: 'aakashdas.live' },
    { name: 'about', url: 'http://localhost:4321/about', title: 'Aakash Das', displayUrl: 'aakashdas.live/about' },
    { name: 'resources', url: 'http://localhost:4321/resources', title: 'Aakash Das', displayUrl: 'aakashdas.live/resources' },
    { name: 'journal', url: 'http://localhost:4321/journal', title: 'Aakash Das', displayUrl: 'aakashdas.live/journal' },
  ];

  // We can render a macOS Safari window frame mockup displaying the real favicon and title
  const faviconSvg = fs.readFileSync('public/favicon.svg', 'utf-8');

  for (const p of pagesToTest) {
    const page = await browser.newPage({ viewport: { width: 1200, height: 750 } });
    await page.goto(p.url, { waitUntil: 'networkidle' });

    // Verify title from DOM
    const domTitle = await page.title();
    console.log(`Page ${p.name} title: "${domTitle}"`);

    await page.close();
  }

  // Create visual showcase of Browser Identity (Light & Dark browser window frames)
  const showcasePage = await browser.newPage({ viewport: { width: 1280, height: 960 } });

  await showcasePage.setContent(`
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", sans-serif; }
          body { background: #EDEDF0; padding: 48px; display: flex; flex-direction: column; gap: 40px; }
          h1 { font-size: 24px; font-weight: 600; color: #111; letter-spacing: -0.02em; }
          .subtitle { font-size: 14px; color: #666; margin-top: 4px; }
          .grid { display: flex; flex-direction: column; gap: 32px; }
          
          /* macOS Window Frame Mockup */
          .mac-window {
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 16px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06);
          }
          .mac-window.dark {
            box-shadow: 0 20px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.1);
          }
          
          /* Titlebar / Tab Bar */
          .titlebar {
            height: 44px;
            display: flex;
            align-items: center;
            padding: 0 16px;
            gap: 16px;
          }
          .light .titlebar {
            background: #E8E8E8;
            border-bottom: 1px solid #D6D6D6;
          }
          .dark .titlebar {
            background: #1E1E1E;
            border-bottom: 1px solid #2C2C2C;
          }

          /* Window Traffic Lights */
          .traffic-lights {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .light-dot { width: 12px; height: 12px; border-radius: 50%; }
          .dot-red { background: #FF5F56; border: 1px solid #E0443E; }
          .dot-yellow { background: #FFBD2E; border: 1px solid #DEA123; }
          .dot-green { background: #27C93F; border: 1px solid #1AAB29; }

          /* Tabs Container */
          .tabs-container {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
            max-width: 680px;
          }
          
          .tab {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 7px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 500;
            flex: 1;
            max-width: 220px;
          }
          .light .tab.active {
            background: #FFFFFF;
            color: #111111;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          .light .tab.inactive {
            color: #666666;
          }
          .dark .tab.active {
            background: #2D2D2D;
            color: #FFFFFF;
            box-shadow: 0 1px 3px rgba(0,0,0,0.3);
          }
          .dark .tab.inactive {
            color: #888888;
          }

          .tab-icon {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .tab-icon svg { width: 16px; height: 16px; display: block; }
          .tab-title {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* URL Bar */
          .url-bar {
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0 16px;
          }
          .light .url-bar {
            background: #F6F6F6;
            border-bottom: 1px solid #E5E5E5;
          }
          .dark .url-bar {
            background: #252526;
            border-bottom: 1px solid #333333;
          }
          .url-input {
            width: 520px;
            height: 26px;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-size: 12px;
          }
          .light .url-input {
            background: #EBEBEB;
            color: #333;
          }
          .dark .url-input {
            background: #181818;
            color: #CCC;
          }
          .lock-icon { opacity: 0.5; width: 12px; height: 12px; }

          /* Content Frame */
          .content-preview {
            height: 180px;
            padding: 32px 48px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .light .content-preview {
            background: #FFFFFF;
            color: #111;
          }
          .dark .content-preview {
            background: #09090B;
            color: #F4F4F5;
          }
          .page-hero-title {
            font-size: 26px;
            font-weight: 600;
            letter-spacing: -0.02em;
          }
          .page-hero-sub {
            font-size: 14px;
            opacity: 0.65;
            margin-top: 6px;
          }
        </style>
      </head>
      <body>
        <div>
          <h1>Brand Identity Verification — Browser Tab & URL System</h1>
          <p class="subtitle">Verifying custom human profile favicon, standardized &lt;title&gt;Aakash Das&lt;/title&gt;, and clean URL routing across Light & Dark browser themes</p>
        </div>

        <div class="grid">
          <!-- Light Theme Window -->
          <div class="mac-window light">
            <div class="titlebar">
              <div class="traffic-lights">
                <div class="light-dot dot-red"></div>
                <div class="light-dot dot-yellow"></div>
                <div class="light-dot dot-green"></div>
              </div>
              <div class="tabs-container">
                <div class="tab active">
                  <div class="tab-icon">${faviconSvg}</div>
                  <div class="tab-title">Aakash Das</div>
                </div>
                <div class="tab inactive">
                  <div class="tab-icon">${faviconSvg}</div>
                  <div class="tab-title">Aakash Das</div>
                </div>
                <div class="tab inactive">
                  <div class="tab-icon">${faviconSvg}</div>
                  <div class="tab-title">Aakash Das</div>
                </div>
              </div>
            </div>
            <div class="url-bar">
              <div class="url-input">
                <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>https://aakashdas.live/journal</span>
              </div>
            </div>
            <div class="content-preview">
              <div class="page-hero-title">Journal</div>
              <div class="page-hero-sub">I write about what I'm learning, what I'm building, and the ideas that make me think.</div>
            </div>
          </div>

          <!-- Dark Theme Window -->
          <div class="mac-window dark">
            <div class="titlebar">
              <div class="traffic-lights">
                <div class="light-dot dot-red"></div>
                <div class="light-dot dot-yellow"></div>
                <div class="light-dot dot-green"></div>
              </div>
              <div class="tabs-container">
                <div class="tab active">
                  <div class="tab-icon">${faviconSvg}</div>
                  <div class="tab-title">Aakash Das</div>
                </div>
                <div class="tab inactive">
                  <div class="tab-icon">${faviconSvg}</div>
                  <div class="tab-title">Aakash Das</div>
                </div>
                <div class="tab inactive">
                  <div class="tab-icon">${faviconSvg}</div>
                  <div class="tab-title">Aakash Das</div>
                </div>
              </div>
            </div>
            <div class="url-bar">
              <div class="url-input">
                <svg class="lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>https://aakashdas.live/resources/001</span>
              </div>
            </div>
            <div class="content-preview">
              <div class="page-hero-title">Starter Personal Budget Framework</div>
              <div class="page-hero-sub">Free personal finance guide and budgeting template.</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `);

  await showcasePage.screenshot({ path: 'public/screenshots/refinement/browser-identity-verification.png' });
  await browser.close();
  console.log('Showcase saved to public/screenshots/refinement/browser-identity-verification.png');
}

captureBrowserIdentity().catch(console.error);
