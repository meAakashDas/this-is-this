import { test, expect } from '@playwright/test';

test.describe('AakashDas.live — Professional About Page QA', () => {
  test('1. About page loads successfully with proper SEO metadata and zero console errors', async ({
    page,
  }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('astro:dev-toolbar') &&
        !msg.text().includes('Outdated Optimize Dep') &&
        !msg.text().includes('compute-pressure')
      ) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/about');

    // Document title (Strictly "Aakash Das" per brand identity directive)
    await expect(page).toHaveTitle('Aakash Das');

    // Meta description
    const metaDesc = page.locator('meta[name="description"]');
    await expect(metaDesc).toHaveAttribute(
      'content',
      /RisePaisa|Information Technology/
    );

    // Canonical link
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute('href', /.*\/about/);

    // Open Graph
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', /About Aakash Das/);

    // Zero console errors
    expect(consoleErrors).toEqual([]);
  });

  test('2. Biography section contains exact required copy with editorial typography', async ({
    page,
  }) => {
    await page.goto('/about');

    const introSection = page.locator('.about-intro-section');
    await expect(introSection).toBeVisible();

    const h1 = introSection.locator('h1#about-intro-title');
    await expect(h1).toHaveText('About Aakash Das');

    const lead = introSection.locator('.about-lead');
    await expect(lead).toContainText(
      "I'm Aakash Das, a Nepal-based finance educator, content creator, and founder of RisePaisa. I work at the intersection of finance, technology, and education, making complex financial topics easier to understand through practical content and digital learning resources."
    );

    const bodyText = introSection.locator('.about-body-text');
    await expect(bodyText).toContainText(
      "My work focuses on Nepal's financial system, including personal finance, banking, taxation, fintech, financial literacy, and the stock market."
    );

    const sublead = introSection.locator('.about-sublead');
    await expect(sublead).toContainText(
      "Alongside my work in finance education, I'm studying Information Technology and exploring how technology can improve the way people learn, access information, and manage their finances."
    );

    // Verify portrait and extra storytelling paragraphs are removed
    await expect(page.locator('.about-portrait-figure')).toHaveCount(0);
    expect(await introSection.textContent()).not.toContain('BIOGRAPHY');
    expect(await introSection.textContent()).not.toContain('IDENTITY & FOCUS');
  });

  test('3. My Work section prioritizes actual initiatives with three refined cards', async ({
    page,
  }) => {
    await page.goto('/about');

    const workSection = page.locator('.about-work-section');
    await expect(workSection).toBeVisible();

    const h2 = workSection.locator('h2#work-heading');
    await expect(h2).toHaveText('My Work');

    // Section label must be removed
    expect(await workSection.textContent()).not.toContain('INITIATIVES');

    const cards = workSection.locator('.work-card');
    await expect(cards).toHaveCount(3);

    // Card 01: RisePaisa
    const card1 = cards.nth(0);
    await expect(card1).toContainText('01');
    await expect(card1).toContainText('RisePaisa');
    await expect(card1).toContainText(
      'Building a Nepal-focused financial education platform that makes personal finance, banking, taxation, fintech, and investment concepts easier to understand through educational content, practical resources, and digital learning tools.'
    );
    const link1 = card1.locator('a.entry-link');
    await expect(link1).toContainText('Visit RisePaisa');
    await expect(link1).toHaveAttribute('href', 'https://risepaisa.com');
    await expect(link1).toHaveAttribute('target', '_blank');

    // Card 02: riseNEPSE
    const card2 = cards.nth(1);
    await expect(card2).toContainText('02');
    await expect(card2).toContainText('riseNEPSE');
    await expect(card2).toContainText(
      "Creating educational content focused on Nepal's stock market, NEPSE, fundamental and technical analysis, and investment knowledge to make stock market education more accessible."
    );
    // Ensure no unverified or invented URL is attached
    await expect(card2.locator('a.entry-link')).toHaveCount(0);

    // Card 03: Finance Education & Content
    const card3 = cards.nth(2);
    await expect(card3).toContainText('03');
    await expect(card3).toContainText('Finance Education & Content');
    await expect(card3).toContainText(
      "Creating educational videos, research-based explanations, and practical digital resources covering Nepal's financial system, personal finance, and technology."
    );
    const link3 = card3.locator('a.entry-link');
    await expect(link3).toContainText('Explore Resources');
    await expect(link3).toHaveAttribute('href', '/resources');

    // Verify role badges (Founder, Finance Educator & Content Creator) are removed
    await expect(workSection.locator('.card-role-badge')).toHaveCount(0);
  });

  test('4. Conversations & Media section accurately presents podcast guest appearance', async ({
    page,
  }) => {
    await page.goto('/about');

    const mediaSection = page.locator('.about-media-section');
    await expect(mediaSection).toBeVisible();

    const h2 = mediaSection.locator('h2#media-heading');
    await expect(h2).toHaveText('Conversations & Media');

    const card = mediaSection.locator('.media-feature-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('The Amit Show');
    await expect(card).toContainText('Podcast Guest');
    await expect(card).toContainText(
      'A conversation about building RisePaisa, content creation, audience growth, and my journey as a young entrepreneur and finance educator.'
    );

    // Ensure not called host
    expect(await card.textContent()).not.toContain('Podcast Host');
  });

  test('5. Education section is minimal with exactly two entries and no completed CA claim', async ({
    page,
  }) => {
    await page.goto('/about');

    const eduSection = page.locator('.about-education-section');
    await expect(eduSection).toBeVisible();

    const h2 = eduSection.locator('h2#education-heading');
    await expect(h2).toHaveText('Education');

    const cards = eduSection.locator('.education-card');
    await expect(cards).toHaveCount(2);

    // Entry 01: IT
    await expect(cards.nth(0)).toContainText('01');
    await expect(cards.nth(0)).toContainText('Information Technology');
    await expect(cards.nth(0)).toContainText('BSc (Hons) Information Technology');
    await expect(cards.nth(0)).toContainText(
      'Coventry University | Via Softwarica College of IT & E-Commerce'
    );
    await expect(cards.nth(0)).toContainText('2025–2028');
    await expect(cards.nth(0)).toContainText('Currently pursuing.');

    // Entry 02: CA Coursework / Transition
    await expect(cards.nth(1)).toContainText('02');
    await expect(cards.nth(1)).toContainText('Chartered Accountancy');
    await expect(cards.nth(1)).toContainText(
      'Previously pursued Chartered Accountancy studies through ICAI, 2024–2025. Later transitioned towards Information Technology.'
    );

    // Verify school and biology education are completely absent
    const fullEduText = (await eduSection.textContent()) || '';
    expect(fullEduText).not.toContain('Science Stream');
    expect(fullEduText).not.toContain('Biology');
    expect(fullEduText).not.toContain('School');
    expect(fullEduText.toLowerCase()).not.toContain('qualified chartered accountant');
  });

  test('6. Removed sections and storytelling clutter are completely absent', async ({
    page,
  }) => {
    await page.goto('/about');

    const pageContent = await page.content();

    // Personal storytelling removed
    expect(pageContent).not.toContain('My Story');
    expect(pageContent).not.toContain('MILESTONES');
    expect(pageContent).not.toContain('Science Education');
    expect(pageContent).not.toContain('Bringing It Together');

    // Interests & distractions removed
    expect(pageContent).not.toContain('What I Am Interested In');
    expect(pageContent).not.toContain('CURIOSITIES');
    expect(pageContent).not.toContain('Finance & Capital Markets');
    expect(pageContent).not.toContain('Productivity & Deliberate Learning');

    // Currently Focused On removed
    expect(pageContent).not.toContain('Currently Focused On');
    expect(pageContent).not.toContain('Building AakashDas.me');
    expect(pageContent).not.toContain('Expanding RisePaisa Initiatives');

    // Decorative uppercase section labels completely removed
    expect(pageContent).not.toContain('IDENTITY & FOCUS');
    expect(pageContent).not.toContain('INITIATIVES');
    expect(pageContent).not.toContain('PUBLIC DISCUSSION');
    expect(pageContent).not.toContain('ACADEMIC BACKGROUND');
    expect(pageContent).not.toContain('CONTACT');
  });

  test('7. Get in Touch section preserves email and all five verified social channels', async ({
    page,
  }) => {
    await page.goto('/about');

    const contactSection = page.locator('.about-contact-section');
    await expect(contactSection).toBeVisible();

    const h2 = contactSection.locator('h2#contact-heading');
    await expect(h2).toHaveText('Get in Touch');

    // Email button
    const emailBtn = contactSection.locator('.email-cta-btn');
    await expect(emailBtn).toBeVisible();
    await expect(emailBtn).toHaveText(/.+@.+\..+/);
    await expect(emailBtn).toHaveAttribute('href', /^mailto:.+@.+\..+/);

    // Social links
    await expect(contactSection).toContainText('Instagram');
    await expect(contactSection).toContainText('YouTube');
    await expect(contactSection).toContainText('TikTok');
    await expect(contactSection).toContainText('LinkedIn');
    await expect(contactSection).toContainText('X');
  });

  test('8. Active navigation state is set to About', async ({ page }) => {
    await page.goto('/about');

    const isMobile = page.viewportSize() && page.viewportSize()!.width <= 640;
    if (!isMobile) {
      const activeNavLink = page.locator('.desktop-nav .nav-link-active');
      await expect(activeNavLink).toHaveText('About');
    }
  });

  test('9. No horizontal overflow on mobile viewport', async ({ page }) => {
    await page.goto('/about');

    const scrollWidth = await page.evaluate(
      () => document.documentElement.scrollWidth
    );
    const clientWidth = await page.evaluate(
      () => document.documentElement.clientWidth
    );

    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });
});
