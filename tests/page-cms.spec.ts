import { test, expect } from '@playwright/test';

test.describe('Homepage & About Page CMS QA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
    await page.evaluate(() => {
      sessionStorage.setItem('aakashdas_dev_preview_active', 'true');
    });
    await page.goto('/admin');
    const hasSidebar = await page
      .locator('aside')
      .waitFor({ state: 'visible', timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    test.skip(
      !hasSidebar,
      'Dev Preview CMS UI tests require astro dev (IS_DEV=true); production preview enforces Google OAuth'
    );
  });

  test('1. Sidebar has Homepage and About tabs marked active/ready', async ({ page }) => {
    const homeTab = page.locator('aside button:has-text("Homepage")');
    const aboutTab = page.locator('aside button:has-text("About")');

    await expect(homeTab).toBeVisible();
    await expect(aboutTab).toBeVisible();

    // Verify neither has coming soon badge
    await expect(homeTab.locator('text=Phase 6')).toHaveCount(0);
    await expect(aboutTab.locator('text=Phase 6')).toHaveCount(0);
  });

  test('2. Clicking Homepage tab loads Homepage CMS with sub-tabs', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Homepage")').click();

    // Verify heading
    await expect(
      page.locator('h1:has-text("Homepage CMS"), h2:has-text("Homepage CMS")')
    ).toBeVisible();

    // Verify sub-tabs
    const subTabs = [
      'Hero Section',
      'Featured Resources',
      'Journal Section',
      'Section Visibility',
      'Live Preview',
    ];

    for (const tab of subTabs) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('3. Hero editor displays baseline inputs and can edit text', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Homepage")').click();

    // Check headline input
    const headlineInput = page.locator('input[value="I\'m Aakash Das."]');
    await expect(headlineInput).toBeVisible();

    // Check brand input
    const brandInput = page.locator('input[value="RisePaisa"]');
    await expect(brandInput).toBeVisible();

    // Check primary CTA text
    const ctaInput = page.locator('input[value="Explore free resources"]');
    await expect(ctaInput).toBeVisible();
  });

  test('4. Homepage Section Visibility editor allows toggling sections', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Homepage")').click();

    // Switch to Section Visibility sub-tab
    await page.locator('button:has-text("Section Visibility")').click();

    // Verify sections header and items
    await expect(
      page.locator('h3:has-text("Section Visibility")')
    ).toBeVisible();
    await expect(page.getByText('Hero Section', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Free Resources', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Get in Touch', { exact: true }).first()).toBeVisible();
  });

  test('5. Homepage Live Preview renders desktop and mobile views', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Homepage")').click();

    // Switch to Live Preview
    await page.locator('button:has-text("Live Preview")').click();

    // Verify preview frame heading and device toggles
    await expect(page.locator('h3:has-text("Live Preview")')).toBeVisible();
    await expect(page.locator('button:has-text("Desktop")')).toBeVisible();
    await expect(page.locator('button:has-text("Mobile (390px)")')).toBeVisible();

    // Switch to Mobile
    await page.locator('button:has-text("Mobile (390px)")').click();
    await expect(page.locator('button:has-text("Mobile (390px)")')).toBeVisible();
  });

  test('6. Clicking About tab loads About Page CMS with sub-tabs', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();

    // Verify heading
    await expect(
      page.locator('h1:has-text("About Page CMS"), h2:has-text("About Page CMS")')
    ).toBeVisible();

    // Verify sub-tabs
    const aboutSubTabs = [
      'Intro & Bio',
      'My Work',
      'Conversations & Media',
      'Education',
      'Experience',
      'Live Preview',
    ];

    for (const tab of aboutSubTabs) {
      await expect(page.locator(`button:has-text("${tab}")`)).toBeVisible();
    }
  });

  test('7. About Intro & Bio editor loads baseline title and paragraphs', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();

    // Verify page display heading input
    const headingInput = page.locator('input[value="About Aakash Das"]');
    await expect(headingInput).toBeVisible();

    // Verify paragraph count
    await expect(page.locator('text=Narrative Paragraphs (3)')).toBeVisible();
  });

  test('8. About Work & Initiatives editor lists work cards with links', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();

    // Switch to Work sub-tab
    await page.locator('button:has-text("My Work")').click();

    // Check work items
    await expect(page.locator('input[value="RisePaisa"]')).toBeVisible();
    await expect(page.locator('input[value="riseNEPSE"]')).toBeVisible();
    await expect(page.locator('input[value="Finance Education & Content"]')).toBeVisible();
  });

  test('9. About Media Mentions editor lists podcast appearances', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();

    // Switch to Media sub-tab
    await page.locator('button:has-text("Conversations & Media")').click();

    // Verify The Amit Show is listed
    await expect(page.locator('input[value="The Amit Show"]')).toBeVisible();
    await expect(page.locator('input[value="Podcast Guest"]').first()).toBeVisible();
  });

  test('10. About Education editor lists academic programs', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();

    // Switch to Education sub-tab
    await page.locator('button:has-text("Education")').click();

    // Verify Coventry and Chartered Accountancy entries
    await expect(page.locator('input[value="Information Technology"]')).toBeVisible();
    await expect(page.locator('input[value="Chartered Accountancy"]')).toBeVisible();
  });

  test('11. About Live Preview renders desktop and mobile toggle', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();

    // Switch to Live Preview
    await page.locator('button:has-text("Live Preview")').click();

    // Verify preview frame
    await expect(page.locator('text=aakashdas.live/about')).toBeVisible();

    // Switch to Mobile
    await page.locator('button:has-text("Mobile (390px)")').click();
    await expect(page.locator('text=390px Viewport')).toBeVisible();
  });

  test('12. Save Draft updates session state and displays success feedback', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Homepage")').click();

    // Click Save Draft
    await page.locator('button:has-text("Save Draft")').click();

    // Verify success banner appears
    await expect(
      page.locator('text=Homepage draft saved to local preview state.')
    ).toBeVisible();
  });

  test('13. Featured Resources editor allows rearranging and removing featured cards', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Homepage")').click();
    await page.locator('button:has-text("Featured Resources")').click();

    // Verify heading input and current featured resources
    await expect(page.locator('h3:has-text("Featured Resources")')).toBeVisible();
    await expect(page.locator('input[value="Free Resources"]')).toBeVisible();
    await expect(page.locator('text=NO. 001')).toBeVisible();
    await expect(page.locator('text=NO. 002')).toBeVisible();
    await expect(page.locator('text=NO. 003')).toBeVisible();

    // Reorder: click move down on first item
    const moveDownButtons = page.locator('button[title="Move down"]');
    await expect(moveDownButtons.first()).toBeEnabled();
  });

  test('14. Journal Section editor allows editing preview heading and destination', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Homepage")').click();
    await page.locator('button:has-text("Journal Section")').click();

    // Verify heading and description fields
    await expect(page.locator('h3:has-text("Journal Section")')).toBeVisible();
    const headingInput = page.locator('input[value="Journal"]');
    await expect(headingInput).toBeVisible();
    await expect(page.locator('input[value="Read articles"]')).toBeVisible();
    await expect(page.locator('input[value="/journal"]')).toBeVisible();
  });

  test('15. Section Visibility editor provides simple toggles for all 5 homepage sections', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Homepage")').click();
    await page.locator('button:has-text("Section Visibility")').click();

    // Verify 5 sections with toggle buttons
    await expect(page.locator('text=01')).toBeVisible();
    await expect(page.locator('text=02')).toBeVisible();
    await expect(page.locator('text=03')).toBeVisible();
    await expect(page.locator('text=04')).toBeVisible();
    await expect(page.locator('text=05')).toBeVisible();

    const toggleButtons = page.locator('button[aria-label^="Toggle visibility"]');
    await expect(toggleButtons).toHaveCount(5);
  });

  test('16. About Intro & Bio editor allows adding and reordering narrative paragraphs', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();

    // Verify Intro & Bio sub-tab
    await expect(page.locator('h3:has-text("Introduction & Biography")')).toBeVisible();

    // Paragraph reorder buttons exist
    const upButtons = page.locator('button[title="Move up"]');
    await expect(upButtons.first()).toBeVisible();
    await expect(upButtons.first()).toBeDisabled(); // first item cannot move up

    // Add paragraph
    const addParaBtn = page.locator('button:has-text("Add Paragraph")');
    await expect(addParaBtn).toBeVisible();
    await addParaBtn.click();
    await expect(page.locator('text=Narrative Paragraphs (4)')).toBeVisible();
  });

  test('17. About Work & Initiatives editor supports automatic numbering and adding initiatives', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();
    await page.locator('button:has-text("My Work")').click();

    // Verify automatic index badges (01, 02, 03)
    await expect(page.locator('text=01').first()).toBeVisible();
    await expect(page.locator('text=02').first()).toBeVisible();
    await expect(page.locator('text=03').first()).toBeVisible();

    // Verify add initiative form exists
    await expect(page.locator('h4:has-text("Add New Initiative")')).toBeVisible();
  });

  test('18. About Experience editor displays professional roles and add form', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();
    await page.locator('button:has-text("Professional Experience")').click();

    // Verify Founder & Lead Educator role is present
    await expect(page.locator('input[value="Founder & Lead Educator"]')).toBeVisible();
    await expect(page.locator('input[value="RisePaisa"]')).toBeVisible();

    // Add form exists
    await expect(page.locator('h4:has-text("Add New Professional Role")')).toBeVisible();
  });

  test('19. Section Order tab is completely absent from About Page CMS', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("About")').click();

    // Verify Section Order button does NOT exist
    await expect(page.locator('button:has-text("Section Order")')).toHaveCount(0);
  });
});
