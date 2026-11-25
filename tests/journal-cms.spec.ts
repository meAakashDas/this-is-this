import { test, expect } from '@playwright/test';

test.describe('Journal & Articles CMS QA', () => {
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
  test('1. Sidebar has Journal tab marked active/ready without Phase 8 badge', async ({
    page,
  }) => {
    await page.goto('/admin');

    const journalTab = page.locator('aside button:has-text("Journal")');
    await expect(journalTab).toBeVisible();
    await expect(journalTab.locator('text=Phase 8')).toHaveCount(0);
  });

  test('2. Clicking Journal tab loads Journal CMS dashboard and metrics', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();

    // Verify main heading
    await expect(
      page.locator('h2:has-text("Journal & Articles CMS")')
    ).toBeVisible();

    // Verify metrics cards exist
    const metricsBar = page.locator('.grid:has-text("Total Articles")');
    await expect(metricsBar.getByText('Total Articles')).toBeVisible();
    await expect(metricsBar.getByText('Published')).toBeVisible();
    await expect(metricsBar.getByText('Drafts')).toBeVisible();
    await expect(metricsBar.getByText('Archived')).toBeVisible();

    // Verify baseline articles are listed
    await expect(page.locator('text=Why I Believe in Learning in Public')).toBeVisible();
    await expect(page.locator('text=Building Something That Matters')).toBeVisible();
    await expect(page.locator('text=Where Finance Meets Technology')).toBeVisible();
  });

  test('3. Search input filters articles by title, slug, or tag', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();

    const searchInput = page.locator('input[placeholder*="Search by title"]');
    await expect(searchInput).toBeVisible();

    // Search for "Beginner"
    await searchInput.fill('Beginner');
    await expect(page.locator('text=The Value of Being a Beginner')).toBeVisible();
    await expect(page.locator('text=Why I Believe in Learning in Public')).toHaveCount(0);

    // Clear search
    await searchInput.fill('');
    await expect(page.locator('text=Why I Believe in Learning in Public')).toBeVisible();
  });

  test('4. Category filter dropdown filters articles', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();

    const categorySelect = page.getByLabel('Filter by category');
    await expect(categorySelect).toBeVisible();

    // Filter by Learning
    await categorySelect.selectOption('Learning');
    await expect(page.locator('text=Why I Believe in Learning in Public')).toBeVisible();
    await expect(page.locator('text=Building Something That Matters')).toHaveCount(0);
  });

  test('5. Status filter pills toggle between All, Published, and Draft', async ({ page }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();

    // Switch to Published
    await page.locator('button:has-text("Published")').first().click();
    await expect(page.locator('text=Why I Believe in Learning in Public')).toBeVisible();

    // Switch to Drafts (initially zero, shows empty state)
    await page.locator('button:has-text("Draft")').first().click();
    await expect(page.locator('text=No articles found')).toBeVisible();

    // Switch back to All
    await page.locator('button:has-text("All")').click();
    await expect(page.locator('text=Why I Believe in Learning in Public')).toBeVisible();
  });

  test('6. Clicking Create Article opens the Notion-Style Journal Editor', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();

    // Click Create Article
    await page.locator('button:has-text("Create Article")').click();

    // Verify editor heading
    await expect(
      page.locator('h2:has-text("Create Journal Article")')
    ).toBeVisible();

    // Verify action bar buttons
    await expect(page.locator('button:has-text("Save Draft")')).toBeVisible();
    await expect(page.locator('button:has-text("Live Preview")')).toBeVisible();
    await expect(page.locator('button:has-text("Publish Article")')).toBeVisible();

    // Verify Notion editor writing canvas and toolbar
    await expect(page.locator('.notion-toolbar')).toBeVisible();
    await expect(page.locator('.notion-prose')).toBeVisible();

    // Verify metrics badges
    await expect(page.locator('text=min read')).toBeVisible();
    await expect(page.locator('text=words')).toBeVisible();
  });

  test('7. Journal Editor allows inputting Title, Subtitle, and Excerpt', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();
    await page.locator('button:has-text("Create Article")').click();

    // Check inputs exist
    const titleInput = page.locator('input[placeholder*="Why I Believe in Learning"]');
    await expect(titleInput).toBeVisible();
    await titleInput.fill('Building Sustainable Wealth');
    await expect(titleInput).toHaveValue('Building Sustainable Wealth');

    const subtitleInput = page.locator('input[placeholder*="Brief secondary subtitle"]');
    await expect(subtitleInput).toBeVisible();
    await subtitleInput.fill('A guide for students and early professionals');
    await expect(subtitleInput).toHaveValue('A guide for students and early professionals');

    const excerptInput = page.locator('textarea[placeholder*="Short introductory summary"]');
    await expect(excerptInput).toBeVisible();
    await excerptInput.fill('An overview of prudent budgeting and long-term asset accumulation.');
    await expect(excerptInput).toHaveValue('An overview of prudent budgeting and long-term asset accumulation.');
  });

  test('8. BlockNote Editor in Journal: Typing, headings, lists, and tables in writing canvas', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();
    await page.locator('button:has-text("Create Article")').click();

    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();
    await page.keyboard.type('Economic Realities in Emerging Markets');
    await expect(editor).toContainText('Economic Realities in Emerging Markets');

    // Press Enter to start new paragraph
    await page.keyboard.press('Enter');
    await page.keyboard.type('First paragraph detailing the importance of cash reserves.');
    await expect(editor).toContainText('First paragraph detailing the importance of cash reserves.');

    // Insert table via /table command
    await page.keyboard.press('Enter');
    await page.keyboard.type('/table');
    await page.keyboard.press('Enter');
    const table = page.locator('.blocknote-canvas-container table, .bn-editor table');
    await expect(table.first()).toBeVisible();
  });

  test('9. BlockNote Editor in Journal: Slash Commands menu (/ commands) inserts blocks', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();
    await page.locator('button:has-text("Create Article")').click();

    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();

    // Type "/" to trigger BlockNote slash menu
    await page.keyboard.type('/');

    const slashMenu = page.locator('.bn-suggestion-menu, [data-suggestion-menu], [role="menu"]');
    await expect(slashMenu.first()).toBeVisible();
  });

  test('10. Nepali Devanagari text is entered and preserved in Journal BlockNote canvas', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();
    await page.locator('button:has-text("Create Article")').click();

    // Fill title with Nepali text
    const titleInput = page.locator('input[placeholder*="Why I Believe in Learning"]');
    await titleInput.fill('नेपालको वित्तीय साक्षरता');
    await expect(titleInput).toHaveValue('नेपालको वित्तीय साक्षरता');

    // Fill BlockNote editor with Nepali text
    const editor = page.locator('.bn-editor');
    await expect(editor).toBeVisible();
    await editor.click();
    const nepaliParagraph = 'बचत र लगानीका आधारभूत सिद्धान्तहरूको व्यावहारिक व्याख्या।';
    await page.keyboard.type(nepaliParagraph);
    await expect(editor).toContainText(nepaliParagraph);
  });

  test('11. Editorial Settings & SEO: Collapsible accordion allows configuring Slug, Tags, Cover Image, and SEO', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();
    await page.locator('button:has-text("Create Article")').click();

    // Click toggle to expand settings
    await page.locator('button:has-text("Editorial Settings, Cover Image & SEO")').click();

    await expect(page.locator('text=Taxonomy & Categorization')).toBeVisible();
    await expect(page.locator('text=Article Tags')).toBeVisible();
    await expect(page.locator('text=Quick Suggested Tags:')).toBeVisible();
    await expect(page.locator('text=Featured Article Image')).toBeVisible();
    await expect(page.locator('text=SEO & Social Graph Metadata')).toBeVisible();
    await expect(page.locator('text=Prevent search engine indexing (noindex)')).toBeVisible();

    // Click suggested tag "NEPSE"
    await page.locator('button:has-text("+ NEPSE")').click();
    await expect(page.locator('button:has-text("✓ NEPSE")')).toBeVisible();
  });

  test('12. Live Preview renders Article Detail View and Journal List Card View', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();

    // Edit baseline article 1
    const editBtn = page.locator('button[aria-label="Edit Article why-i-believe-in-learning-in-public"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Switch to Live Preview
    await page.locator('button:has-text("Live Preview")').click();

    // Verify detail page mode preview
    await expect(page.locator('text=https://aakashdas.live/journal/why-i-believe-in-learning-in-public')).toBeVisible();
    await expect(page.locator('text=Teaching as a Learning Mechanism')).toBeVisible();

    // Switch to Journal List Card View
    await page.locator('button:has-text("Journal List Card View")').click();
    await expect(page.locator('text=Read entry')).toBeVisible();

    // Switch to Mobile Viewport
    await page.locator('button[aria-label="Mobile preview"]').click();
    await expect(page.locator('text=390px')).toBeVisible();
  });

  test('13. Edit button opens existing article with prefilled values and Notion canvas', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();

    // Click edit on article 2
    const editBtn = page.locator('button[aria-label="Edit Article building-something-that-matters"]');
    await expect(editBtn).toBeVisible();
    await editBtn.click();

    // Verify prefilled values
    await expect(
      page.locator('input[value="Building Something That Matters"]')
    ).toBeVisible();
    await expect(
      page.locator('.notion-prose')
    ).toBeVisible();
  });

  test('14. Duplicating an article creates a draft clone with distinct slug', async ({
    page,
  }) => {
    await page.goto('/admin');
    await page.locator('aside button:has-text("Journal")').click();

    // Duplicate article 3
    const dupBtn = page.locator('button[aria-label="Duplicate Article where-finance-meets-technology"]');
    await expect(dupBtn).toBeVisible();
    await dupBtn.click();

    // Verify duplicated copy appears in list
    const copyCard = page.locator('.article-card', {
      hasText: 'Where Finance Meets Technology (Copy)',
    });
    await expect(copyCard).toBeVisible();
    await expect(copyCard.getByText('DRAFT', { exact: true })).toBeVisible();
  });

  test('15. Public /journal and /journal/why-i-believe-in-learning-in-public routes remain completely intact', async ({
    page,
  }) => {
    // Check public journal catalog
    await page.goto('/journal');
    await expect(page.locator('h1:has-text("Journal")')).toBeVisible();
    await expect(page.locator('text=Why I Believe in Learning in Public')).toBeVisible();

    // Check public article detail page
    await page.goto('/journal/why-i-believe-in-learning-in-public');
    await expect(
      page.locator('h1:has-text("Why I Believe in Learning in Public")')
    ).toBeVisible();
    await expect(page.locator('text=Teaching as a Learning Mechanism')).toBeVisible();
    await expect(page.locator('text=Back to Journal')).toBeVisible();
  });
});
