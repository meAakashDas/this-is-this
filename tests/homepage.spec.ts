import { test, expect } from '@playwright/test';

test.describe('AakashDas.live — Simplified Homepage QA', () => {
  test('1. Homepage loads successfully with proper metadata and no console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('astro:dev-toolbar') &&
        !msg.text().includes('Outdated Optimize Dep')
      ) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/');

    // Check document title (Strictly "Aakash Das" per brand identity directive)
    await expect(page).toHaveTitle('Aakash Das');

    // Check meta tags
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute('content', /Softwarica|RisePaisa/);

    // Verify no console errors
    expect(consoleErrors).toEqual([]);
  });

  test('2. Hero Section contains only requested elements with clear hierarchy', async ({
    page,
  }) => {
    await page.goto('/');

    // Brand name in header (must be plain text, no decorative logo)
    const brandName = page.locator('.brand-name');
    await expect(brandName).toHaveText('Aakash Das');

    // Removed redundant introductory label above headline
    await expect(page.locator('.hero-intro-label')).toHaveCount(0);

    // H1 in Hero section
    const h1 = page.locator('main h1#hero-title');
    await expect(h1).toBeVisible();
    await expect(h1).toHaveText("I'm Aakash Das.");

    // Role below headline with clickable RisePaisa link
    const role = page.locator('.hero-role');
    await expect(role).toBeVisible();
    await expect(role).toHaveText('Founder of RisePaisa.');
    const risePaisaLink = role.locator('a.hero-brand-link');
    await expect(risePaisaLink).toBeVisible();
    await expect(risePaisaLink).toHaveAttribute('href', 'https://risepaisa.com');
    await expect(risePaisaLink).toHaveAttribute('target', '_blank');
    await expect(risePaisaLink).toHaveAttribute('rel', 'noopener noreferrer');

    // Subtle personal statement
    const tagline = page.locator('.hero-tagline');
    await expect(tagline).toBeVisible();
    await expect(tagline).toHaveText('I love learning, building, and sharing.');

    // Hero action buttons: Explore free resources and About me
    const primaryBtn = page.locator('.hero-actions .hero-btn-primary');
    await expect(primaryBtn).toBeVisible();
    await expect(primaryBtn).toContainText('Explore free resources');
    await expect(primaryBtn).toHaveAttribute('href', '/resources');

    const aboutBtn = page.locator('.hero-actions .hero-btn-secondary');
    await expect(aboutBtn).toBeVisible();
    await expect(aboutBtn).toContainText('About me');
    await expect(aboutBtn).toHaveAttribute('href', '/about');

    // Removed old secondary button
    const secondaryBtn = page.locator('.hero-actions').getByText('Get to know me');
    await expect(secondaryBtn).toHaveCount(0);

    // Profile photograph: natural presentation without rectangular card or separate name caption underneath
    const portrait = page.locator('.hero-portrait-img');
    await expect(portrait).toBeVisible();
    const portraitSrc = await portrait.getAttribute('src');
    expect(portraitSrc).toBeTruthy();
    expect(portraitSrc).not.toMatch(/^blob:/i);
    await expect(portrait).toHaveJSProperty('complete', true);

    // Verify old square vignette card and caption are completely removed
    await expect(page.locator('.identity-vignette-card')).toHaveCount(0);
    await expect(page.locator('.vignette-name')).toHaveCount(0);

    // Verify all other metadata in hero removed
    const heroText = await page.locator('.hero-section').textContent();
    expect(heroText).not.toContain('Kathmandu, Nepal · IT & finance');
    expect(heroText).not.toContain('Information Technology student');
  });

  test('3. Removed sections are absent from the homepage', async ({ page }) => {
    await page.goto('/');

    const pageContent = await page.content();

    // Background section removed
    expect(pageContent).not.toContain('Building at the Intersection of Finance & Technology');
    expect(pageContent).not.toContain('Read full story & background');

    // Explore what I’m building project cards moved away from homepage
    expect(pageContent).not.toContain('A few things I’m working on');
    expect(pageContent).not.toContain('project-spotlight-card');

    // Journal preview descriptions removed
    expect(pageContent).not.toContain('Journal in Preparation');
    expect(pageContent).not.toContain('Field Notes & Forthcoming Essays');
    expect(pageContent).not.toContain('Nepal Banking & Capital');
  });

  test('4. Resource Lookup is positioned directly below Hero and functions correctly', async ({
    page,
  }) => {
    await page.goto('/');

    const lookupZone = page.locator('.lookup-zone');
    await expect(lookupZone).toBeVisible();

    // Section heading: Find Resources
    const heading = lookupZone.locator('.lookup-heading');
    await expect(heading).toHaveText('Find Resources');

    // Input with placeholder "Enter resource number", initially EMPTY
    const input = lookupZone.locator('#resource-number-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveValue('');
    await expect(input).toHaveAttribute('placeholder', 'Enter resource number');

    // Button: Find
    const submitBtn = lookupZone.locator('#finder-submit-btn');
    await expect(submitBtn).toBeVisible();
    await expect(submitBtn).toContainText('Find');

    // Removed elements
    expect(await lookupZone.textContent()).not.toContain('Instant Access');
    expect(await lookupZone.textContent()).not.toContain('Direct Resource Lookup');
    expect(await lookupZone.textContent()).not.toContain('Quick samples');

    // Test validation and navigation
    const statusBox = lookupZone.locator('#finder-status');
    await submitBtn.click();
    await expect(statusBox).toBeVisible();
    await expect(statusBox).toContainText(/Please enter a.*resource number/i);

    // Enter valid resource number '001'
    await input.fill('001');
    await submitBtn.click();
    await page.waitForURL(/\/resources\/001/, { timeout: 10000 });
    await expect(page).toHaveURL(/\/resources\/001/);
  });

  test('5. Free Resources cards section displays three items with View all link', async ({
    page,
  }) => {
    await page.goto('/');

    const libZone = page.locator('.library-zone');
    await expect(libZone).toBeVisible();

    // Section heading: Free Resources
    const heading = libZone.locator('#featured-resources-heading');
    await expect(heading).toHaveText('Free Resources');

    // Right-side link: View all →
    const viewAll = libZone.locator('.view-all-link');
    await expect(viewAll).toBeVisible();
    await expect(viewAll).toContainText('View all');
    await expect(viewAll).toHaveAttribute('href', '/resources');

    // Check three cards
    const cards = libZone.locator('.featured-card');
    await expect(cards).toHaveCount(3);
    await expect(cards.nth(0)).toContainText('Starter Personal Budget Framework');
    await expect(cards.nth(1)).toContainText('Nepal Banking & Account Checklist');
    await expect(cards.nth(2)).toContainText('Student Productivity & Semester Tracker');
  });

  test('6. Journal section displays only the word Journal and is clickable', async ({
    page,
  }) => {
    await page.goto('/');

    const journalZone = page.locator('.journal-zone');
    await expect(journalZone).toBeVisible();

    const link = journalZone.locator('.journal-title-link');
    await expect(link).toBeVisible();
    await expect(link).toHaveText('Journal');
    await expect(link).toHaveAttribute('href', '/journal');

    await link.click();
    await expect(page).toHaveURL(/\/journal/);
  });

  test('7. Get in Touch section has heading and direct contact methods without descriptions', async ({
    page,
  }) => {
    await page.goto('/');

    const contactZone = page.locator('.contact-zone');
    await expect(contactZone).toBeVisible();

    const heading = contactZone.locator('#contact-heading');
    await expect(heading).toHaveText('Get in Touch');

    // Email primary button
    const emailBtn = contactZone.locator('.email-cta-btn');
    await expect(emailBtn).toBeVisible();
    await expect(emailBtn).toContainText('contact@aakashdas.live');
    await expect(emailBtn).toHaveAttribute('href', 'mailto:contact@aakashdas.live');

    // Social links
    await expect(contactZone).toContainText('Instagram');
    await expect(contactZone).toContainText('YouTube');
    await expect(contactZone).toContainText('TikTok');
    await expect(contactZone).toContainText('LinkedIn');
    await expect(contactZone).toContainText('X');

    // No introductory description
    expect(await contactZone.textContent()).not.toContain('Communication');
    expect(await contactZone.textContent()).not.toContain('Have a question, feedback');
  });

  test('8. Footer is minimal with nav, social links, and email only', async ({
    page,
  }) => {
    await page.goto('/');

    const footer = page.locator('footer.site-footer');
    await expect(footer).toBeVisible();

    // Nav links
    await expect(footer.locator('.footer-nav')).toContainText('Home');
    await expect(footer.locator('.footer-nav')).toContainText('About');
    await expect(footer.locator('.footer-nav')).toContainText('Resources');
    await expect(footer.locator('.footer-nav')).toContainText('Journal');

    // Social links
    await expect(footer.locator('.footer-social-links')).toContainText('Instagram');
    await expect(footer.locator('.footer-social-links')).toContainText('YouTube');
    await expect(footer.locator('.footer-social-links')).toContainText('TikTok');
    await expect(footer.locator('.footer-social-links')).toContainText('LinkedIn');
    await expect(footer.locator('.footer-social-links')).toContainText('X');
    await expect(footer.locator('.footer-social-links')).toContainText('Facebook');

    // Email
    const email = footer.locator('.footer-email');
    await expect(email).toBeVisible();
    await expect(email).toContainText('contact@aakashdas.live');
    await expect(email).toHaveAttribute('href', 'mailto:contact@aakashdas.live');

    // Direct contact buttons
    const callBtn = footer.locator('a[aria-label="Call me"]');
    await expect(callBtn).toBeVisible();
    await expect(callBtn).toContainText('Call me');
    await expect(callBtn).toHaveAttribute('href', /^tel:/);

    const whatsappBtn = footer.locator('a[aria-label="WhatsApp"]');
    await expect(whatsappBtn).toBeVisible();
    await expect(whatsappBtn).toContainText('WhatsApp');
    await expect(whatsappBtn).toHaveAttribute('href', /https:\/\/wa\.me\//);

    // Removed elements
    const footerText = await footer.textContent();
    expect(footerText).not.toContain('Finance, technology, and educational resources');
    expect(footerText).not.toContain('An independent personal archive');
  });

  test('9. Navigation links navigate cleanly on desktop or mobile', async ({
    page,
  }) => {
    await page.goto('/');

    const isMobile = page.viewportSize() && page.viewportSize()!.width <= 640;

    if (!isMobile) {
      const desktopNav = page.locator('.desktop-nav');
      await expect(desktopNav).toBeVisible();

      const aboutLink = desktopNav.getByRole('link', { name: 'About' });
      await expect(aboutLink).toBeVisible();

      await aboutLink.click();
      await expect(page).toHaveURL(/\/about/);
      await expect(page.locator('main h1')).toContainText('About Aakash Das');
    } else {
      const menuBtn = page.locator('#mobile-nav-toggle');
      await expect(menuBtn).toBeVisible();
      await menuBtn.click();

      const drawer = page.locator('#mobile-nav-drawer');
      await expect(drawer).toBeVisible();

      const aboutMobileLink = drawer.getByRole('link', { name: 'About' });
      await expect(aboutMobileLink).toBeVisible();
      await aboutMobileLink.click();

      await expect(page).toHaveURL(/\/about/);
      await expect(page.locator('main h1')).toContainText('About Aakash Das');
    }
  });

  test('9b. Header cleanup: logo icon and search bar are completely removed', async ({
    page,
  }) => {
    await page.goto('/');

    const header = page.locator('header.site-header');
    await expect(header).toBeVisible();

    // 1. Logo icon (square with diagonal lines) is completely removed
    await expect(header.locator('.brand-mark')).toHaveCount(0);
    await expect(header.locator('.brand-link svg')).toHaveCount(0);

    // 2. Brand name text is present and neatly positioned
    const brandName = header.locator('.brand-name');
    await expect(brandName).toBeVisible();
    await expect(brandName).toHaveText('Aakash Das');

    // 3. Search resources input and shortcut kbd indicator are completely removed
    await expect(header.locator('a[aria-label="Search resources"]')).toHaveCount(0);
    await expect(header.locator('kbd')).toHaveCount(0);
    const headerText = (await header.textContent()) || '';
    expect(headerText).not.toContain('Search resources');
    expect(headerText).not.toContain('⌘K');

    // 4. Preserved elements: Say hello, theme toggle
    await expect(header.locator('.header-contact-link')).toHaveText(/Say hello/);
    await expect(header.locator('#theme-toggle-btn')).toBeVisible();
  });

  test('10. Color scheme: white background consistently renders in light mode', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');

    const bgColor = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });

    expect(bgColor).toBe('rgb(255, 255, 255)');
  });
});

test.describe('Mobile Viewport Specific QA', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Mobile hamburger menu toggles drawer and supports Escape key', async ({
    page,
  }) => {
    await page.goto('/');

    const menuBtn = page.locator('#mobile-nav-toggle');
    await expect(menuBtn).toBeVisible();

    const drawer = page.locator('#mobile-nav-drawer');
    await expect(drawer).toBeHidden();

    // Open drawer
    await menuBtn.click();
    await expect(drawer).toBeVisible();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');

    // Close via Escape key
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('No horizontal scrolling on mobile', async ({ page }) => {
    await page.goto('/');

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  test('Mobile hero is centered with photograph first, heading second, and empty search input', async ({
    page,
  }) => {
    await page.goto('/');

    const portrait = page.locator('.hero-portrait-img');
    const h1 = page.locator('main h1#hero-title');
    const role = page.locator('.hero-role');
    const tagline = page.locator('.hero-tagline');
    const cta = page.locator('.hero-actions .hero-btn').first();
    const input = page.locator('#resource-number-input');

    // Verify search input is EMPTY on initial page load
    await expect(input).toHaveValue('');

    // Elements are all visible
    await expect(portrait).toBeVisible();
    await expect(h1).toBeVisible();
    await expect(role).toBeVisible();
    await expect(tagline).toBeVisible();
    await expect(cta).toBeVisible();

    // Verify visual order: photograph is positioned ABOVE heading
    const portraitBox = (await portrait.boundingBox())!;
    const h1Box = (await h1.boundingBox())!;
    const roleBox = (await role.boundingBox())!;
    const taglineBox = (await tagline.boundingBox())!;
    const ctaBox = (await cta.boundingBox())!;

    expect(portraitBox.y).toBeLessThan(h1Box.y);
    expect(h1Box.y).toBeLessThan(roleBox.y);
    expect(roleBox.y).toBeLessThan(taglineBox.y);
    expect(taglineBox.y).toBeLessThan(ctaBox.y);

    // Verify centered alignment on mobile (viewport center is 375 / 2 = 187.5px)
    const viewportWidth = 375;
    const viewportCenter = viewportWidth / 2;

    const portraitCenter = portraitBox.x + portraitBox.width / 2;
    expect(Math.abs(portraitCenter - viewportCenter)).toBeLessThan(15);

    const ctaCenter = ctaBox.x + ctaBox.width / 2;
    expect(Math.abs(ctaCenter - viewportCenter)).toBeLessThan(15);

    // Verify text-align is center
    const h1Align = await h1.evaluate(
      (el) => window.getComputedStyle(el).textAlign
    );
    expect(h1Align).toBe('center');

    const roleAlign = await role.evaluate(
      (el) => window.getComputedStyle(el).textAlign
    );
    expect(roleAlign).toBe('center');

    // Verify RisePaisa clickable link in hero role
    const brandLink = role.locator('a.hero-brand-link');
    await expect(brandLink).toBeVisible();
    await expect(brandLink).toHaveAttribute('href', 'https://risepaisa.com');
  });
});
