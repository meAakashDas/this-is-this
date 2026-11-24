import type { Resource } from '../types';

/**
 * Educational Resource Library Data
 * Every resource has an immutable, permanent identifier (e.g. "001", "002").
 * URLs derive permanently from resourceNumber: https://aakashdas.live/resources/[resourceNumber]
 */
export const resourcesData: Resource[] = [
  {
    resourceNumber: '001',
    title: 'Starter Personal Budget Framework',
    category: 'Personal Finance',
    publishedAt: '2025-01-15',
    updatedAt: '2025-02-10',
    published: true,
    downloadFormat: 'Spreadsheet (.xlsx)',
    fileSize: '142 KB',
    downloadUrl: '/downloads/starter-budget-template-001.pdf',
    pdfPreviewUrl: '/downloads/starter-budget-template-001.pdf',
    docxUrl: '/downloads/starter-budget-template-001.docx',
    attachments: [
      {
        id: 'att-001-pdf',
        name: 'Starter Budget Guide & Printable Worksheet',
        format: 'PDF Document',
        fileSize: '142 KB',
        url: '/downloads/starter-budget-template-001.pdf',
        isPreviewable: true,
      },
      {
        id: 'att-001-csv',
        name: 'Zero-Based Monthly Cash Flow Model',
        format: 'CSV Spreadsheet',
        fileSize: '12 KB',
        url: '/downloads/starter-budget-model-001.csv',
        isPreviewable: false,
      },
    ],
    youtubeEmbed: {
      videoId: 'dQw4w9WgXcQ',
      title: 'Understanding Zero-Based Cash Flow Mechanics',
      caption:
        'Editorial walkthrough: structuring cash flows, fixed commitments, and liquid reserves.',
    },
    description:
      'A clean, structured monthly budgeting template designed for Nepali students and young professionals managing living expenses, emergency savings, and discretionary cash flow.',
    tags: ['Budgeting', 'Spreadsheet', 'Personal Finance', 'Nepal'],
    summaryPoints: [
      'Zero-based income and expense allocation formula adapted for monthly cash flows',
      'Dedicated emergency fund milestone tracker with customizable targets',
      'Discretionary spending categories tailored for urban living in Nepal',
      'Automated visual tables summarizing necessity vs. lifestyle ratios',
    ],
    targetAudience:
      'Students and early-career professionals in Nepal starting personal budgeting.',
    contentBlocks: [
      {
        type: 'heading',
        level: 2,
        text: 'Framework Principles & Cash Flow Mechanics',
      },
      {
        type: 'paragraph',
        text: 'Personal budgeting is not about restriction—it is about intentional capital allocation. In Nepal, young professionals and students often experience irregular cash flows from freelance projects, allowances, or entry-level stipends. This framework applies a zero-based cash allocation methodology adapted for living expenses in Kathmandu and urban centers.',
      },
      {
        type: 'blockquote',
        text: 'A budget tells your money where to go instead of wondering where it went.',
        caption: 'Core principle of zero-based financial allocation',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Recommended Cash Flow Allocation Model',
      },
      {
        type: 'paragraph',
        text: 'We recommend dividing incoming monthly cash flow into three core buckets before committing to discretionary purchases:',
      },
      {
        type: 'bulletList',
        items: [
          'Fixed Baseline Needs (50%): Housing rent, internet, mobile recharge, groceries, and local commute.',
          'Emergency & Future Reserves (30%): Liquid bank emergency reserve, health contingencies, and long-term savings.',
          'Discretionary & Cultural (20%): Social dining, festivals, family obligations, and personal development.',
        ],
      },
      {
        type: 'table',
        caption:
          'Table 1: Standard zero-based budget distribution for early-career income in Nepal.',
        headers: [
          'Spending Category',
          'Recommended Share',
          'Kathmandu Baseline (NPR 30,000)',
          'Tracking Frequency',
        ],
        rows: [
          ['Fixed Essentials & Rent', '50%', 'NPR 15,000', 'Monthly recurring'],
          ['Liquid Emergency Reserve', '20%', 'NPR 6,000', 'Per income cycle'],
          ['Skill Building & Books', '10%', 'NPR 3,000', 'Flexible monthly'],
          ['Discretionary & Social', '20%', 'NPR 6,000', 'Weekly reviewed'],
        ],
      },
      {
        type: 'callout',
        variant: 'info',
        title: 'Rule of Thumb for Emergency Reserves',
        text: 'Always accumulate at least 3 months of baseline non-negotiable living costs in an easily accessible Class-A commercial bank savings account before investing in illiquid or high-risk vehicles.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Step-by-Step Implementation Guide',
      },
      {
        type: 'orderedList',
        items: [
          'Calculate your net realized monthly income across all verified sources.',
          'List all contractual fixed commitments (room rent, electricity, ISP, mobile recharge).',
          'Set aside your savings allocation immediately on payday rather than budgeting from what remains at month-end.',
          'Distribute remaining discretionary funds across 4 weekly spending envelopes.',
        ],
      },
    ],
  },
  {
    resourceNumber: '002',
    title: 'Nepal Banking & Account Checklist',
    category: 'Financial Literacy',
    publishedAt: '2025-01-28',
    updatedAt: '2025-02-01',
    published: true,
    downloadFormat: 'PDF Guide',
    fileSize: '210 KB',
    downloadUrl: '/downloads/nepal-banking-checklist-002.pdf',
    pdfPreviewUrl: '/downloads/nepal-banking-checklist-002.pdf',
    docxUrl: '/downloads/nepal-banking-checklist-002.docx',
    attachments: [
      {
        id: 'att-002-pdf',
        name: 'Commercial Banking Comparison Checklist',
        format: 'PDF Guide',
        fileSize: '210 KB',
        url: '/downloads/nepal-banking-checklist-002.pdf',
        isPreviewable: true,
      },
    ],
    youtubeEmbed: {
      videoId: 'kJQP7kiw5Fk',
      title: 'Navigating Commercial Banking and Digital Payments in Nepal',
      caption:
        'Evaluation criteria: fee schedules, digital banking security, and account rights.',
    },
    description:
      'A practical evaluation guide for comparing commercial bank savings accounts, mobile banking charges, debit card fees, and digital transaction limits across banks in Nepal.',
    tags: ['Banking', 'Checklist', 'Financial Literacy', 'Nepal'],
    summaryPoints: [
      'Core documentation and KYC verification checklist for Nepali banks',
      'Standard fee schedules and annual maintenance charges across Class-A banks',
      'Transaction limits, mobile banking security rules, and ConnectIPS best practices',
      'Step-by-step checklist to evaluate bank interest tiers without marketing bias',
    ],
    targetAudience:
      'Anyone opening, reviewing, or consolidating personal bank accounts in Nepal.',
    contentBlocks: [
      {
        type: 'heading',
        level: 2,
        text: 'Navigating Retail Banking in Nepal',
      },
      {
        type: 'paragraph',
        text: 'Choosing the right commercial bank (Class-A) in Nepal involves balancing branch convenience, mobile banking platform stability, and hidden annual maintenance fees. Many account holders unknowingly incur debit card renewal fees, SMS alert charges, and interbank transfer commissions that silently erode low-balance savings.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Key Comparison Metrics & Regulatory Benchmarks',
      },
      {
        type: 'table',
        caption:
          'Table 1: Commercial bank fee benchmarks under Nepal Rastra Bank directives.',
        headers: [
          'Service / Feature',
          'Standard Bank Range',
          'Recommended Threshold',
          'Watchout',
        ],
        rows: [
          [
            'Minimum Balance Requirement',
            'NPR 0 – 5,000',
            'NPR 0 (Zero balance)',
            'Penalty charges for low balance',
          ],
          [
            'Mobile Banking Annual Fee',
            'NPR 250 – 500',
            'Free or capped under NPR 300',
            'Auto-deducted from account',
          ],
          [
            'Debit Card Issuance / Renewal',
            'NPR 350 – 600 / year',
            'Under NPR 400',
            'Multi-year bundle charges',
          ],
          [
            'ConnectIPS Transfer Cap',
            'Up to NPR 2,000,000 / day',
            'Standard NRB limit',
            'Tiered per-transaction charge (NPR 2–8)',
          ],
        ],
      },
      {
        type: 'callout',
        variant: 'tip',
        title: 'Student Account Privilege',
        text: 'Most Class-A commercial banks in Nepal offer dedicated Student Savings Accounts with zero minimum balance requirements and waivers on first-year mobile banking charges upon showing a valid college ID card.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Opening Your Account: Essential Verification Sequence',
      },
      {
        type: 'orderedList',
        items: [
          'Verify your National Identity Card (NID) or Citizenship certificate details with clear scanned copies.',
          'Obtain a recommendation letter or college ID if applying for a concessionary student account.',
          'Register for ConnectIPS directly through self-verification or bank branch linking.',
          'Set up biometric or two-factor authentication on mobile banking apps immediately upon activation.',
        ],
      },
    ],
  },
  {
    resourceNumber: '003',
    title: 'Student Productivity & Semester Tracker',
    category: 'Productivity & Education',
    publishedAt: '2025-02-05',
    published: true,
    downloadFormat: 'Notion Template & Printable PDF',
    fileSize: '185 KB',
    downloadUrl: '/downloads/student-productivity-tracker-003.pdf',
    pdfPreviewUrl: '/downloads/student-productivity-tracker-003.pdf',
    docxUrl: '/downloads/student-productivity-tracker-003.docx',
    attachments: [
      {
        id: 'att-003-pdf',
        name: 'Academic Planner & Semester Tracking Sheet',
        format: 'Printable PDF',
        fileSize: '185 KB',
        url: '/downloads/student-productivity-tracker-003.pdf',
        isPreviewable: true,
      },
    ],
    youtubeEmbed: {
      videoId: 'fJ9rUzIMcZQ',
      title: 'Structuring Academic Workflows and Project Deadlines',
      caption:
        'System overview: organizing lab deliverables, capstone sprints, and active recall notes.',
    },
    description:
      'A minimal workspace template for organizing university modules, assignment deadlines, self-directed research notes, and weekly study targets.',
    tags: ['Productivity', 'Education', 'Templates', 'University'],
    summaryPoints: [
      'Semester module database tracking credits, professors, and class schedules',
      'Weekly assignment deadline board prioritizing deliverables by urgency',
      'Structured lecture notes capture framework with active recall sections',
      'Focus session tracker designed to eliminate digital study distractions',
    ],
    targetAudience:
      'College and university students managing multiple academic modules and deadlines.',
    contentBlocks: [
      {
        type: 'heading',
        level: 2,
        text: 'Academic Workflow Architecture',
      },
      {
        type: 'paragraph',
        text: 'Balancing coursework, college laboratory assignments, and personal skill development requires a systematic tracking system. Rather than keeping deadlines in your head or fragmented across chat apps, this tracker establishes a single source of truth for your semester.',
      },
      {
        type: 'blockquote',
        text: 'Structure liberates creativity. When your deadlines are managed systematically, you have mental bandwidth to actually learn.',
        caption: 'Academic workflow principle',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Weekly Planning Cadence',
      },
      {
        type: 'bulletList',
        items: [
          'Sunday Planning Session (20 minutes): Review upcoming assignment deliverables and lecture schedules.',
          'Daily 3-Priority Rule: Define only three major academic objectives per morning.',
          'Mid-Week Buffer Block: Allocate 90 minutes on Wednesdays to absorb overflow or difficult lab reports.',
          'Friday Reflection & Archiving: File completed assignment documents and update progress status.',
        ],
      },
      {
        type: 'table',
        caption: 'Table 1: Academic task prioritization framework.',
        headers: [
          'Module Deliverable',
          'Urgency Tier',
          'Preparation Window',
          'Review Checklist',
        ],
        rows: [
          [
            'Laboratory Report / Practical',
            'High (Weekly)',
            '2 days prior to lab',
            'Code compile check & outputs',
          ],
          [
            'Mid-Term Coursework Essay',
            'Medium (Monthly)',
            '10 days prior',
            'Reference citation & outline',
          ],
          [
            'Final Capstone Project',
            'High (Ongoing)',
            'Weekly sprint reviews',
            'Git commits & documentation',
          ],
          [
            'Self-Study / External Skills',
            'Continuous',
            '1 hour daily block',
            'Project implementation',
          ],
        ],
      },
      {
        type: 'callout',
        variant: 'warning',
        title: 'Beware Deadline Compression',
        text: 'Never schedule final submission uploads within 1 hour of university portal closing. Server congestion and ISP drops frequently cause unsubmitted penalties.',
      },
    ],
  },
  {
    resourceNumber: '004',
    title: 'Emergency Reserve & Contingency Calculator',
    category: 'Personal Finance',
    publishedAt: '2025-03-01',
    published: false, // DRAFT / UNPUBLISHED — Must NEVER appear in public library listings!
    downloadFormat: 'Spreadsheet (.xlsx)',
    fileSize: '160 KB',
    downloadUrl: '#',
    description:
      'A practical calculator for computing 3-to-6 month living contingency thresholds in Nepal.',
    tags: ['Emergency Fund', 'Draft'],
    summaryPoints: [
      'Baseline monthly non-negotiable living cost index',
      'Liquid reserve tiered allocations across high-yield savings instruments',
    ],
    targetAudience: 'Draft internal testing resource.',
  },
];

/**
 * Returns all published resources, sorted numerically by permanent resourceNumber.
 * Excludes any drafts or unpublished entries.
 */
export function getAllPublishedResources(): Resource[] {
  return resourcesData
    .filter((r) => r.published)
    .sort((a, b) =>
      a.resourceNumber.localeCompare(b.resourceNumber, undefined, {
        numeric: true,
      })
    );
}

/**
 * Resolves a published resource by its exact permanent number.
 * Returns undefined if nonexistent or unpublished.
 */
export function getPublishedResourceByNumber(
  number: string
): Resource | undefined {
  return resourcesData.find((r) => r.published && r.resourceNumber === number);
}

/**
 * Returns list of published resource numbers for static path generation.
 */
export function getAllPublishedResourceNumbers(): string[] {
  return getAllPublishedResources().map((r) => r.resourceNumber);
}

/**
 * Returns adjacent published resources (previous and next) in numeric order.
 * Returns undefined for prev if first, or next if last.
 */
export function getAdjacentPublishedResources(currentNumber: string): {
  prev?: Resource;
  next?: Resource;
} {
  const published = getAllPublishedResources();
  const currentIndex = published.findIndex(
    (r) => r.resourceNumber === currentNumber
  );

  if (currentIndex === -1) {
    return { prev: undefined, next: undefined };
  }

  return {
    prev: currentIndex > 0 ? published[currentIndex - 1] : undefined,
    next:
      currentIndex < published.length - 1
        ? published[currentIndex + 1]
        : undefined,
  };
}
