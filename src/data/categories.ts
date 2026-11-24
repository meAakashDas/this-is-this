/**
 * Central Educational Resource Categories
 * Used across Resource CMS, Catalog, and Filter components.
 */

export interface ResourceCategory {
  id: string;
  name: string;
  description: string;
  color?: string;
}

export const RESOURCE_CATEGORIES: ResourceCategory[] = [
  { id: 'personal-finance', name: 'Personal Finance', description: 'Budgeting, personal capital allocation, and expense management' },
  { id: 'banking', name: 'Banking', description: 'Commercial banks, digital wallets, KYC, cards, and payment security' },
  { id: 'investment', name: 'Investment', description: 'Long-term wealth building, mutual funds, and fixed deposits' },
  { id: 'stock-market', name: 'Stock Market', description: 'Capital market fundamentals and trading mechanisms' },
  { id: 'nepse', name: 'NEPSE', description: 'Nepal Stock Exchange indicators, indices, and market analysis' },
  { id: 'taxation', name: 'Taxation', description: 'Income tax slabs, TDS, VAT, and fiscal compliance in Nepal' },
  { id: 'productivity', name: 'Productivity', description: 'Semester planning, habit tracking, and time management' },
  { id: 'education', name: 'Education', description: 'IT, academic roadmaps, and career development' },
  { id: 'business', name: 'Business', description: 'Entrepreneurship, startup building, and compliance in Nepal' },
  { id: 'templates', name: 'Templates', description: 'Ready-to-use worksheets, trackers, and Notion/Excel models' },
  { id: 'guides', name: 'Guides', description: 'Comprehensive step-by-step explanatory documentation' },
  { id: 'checklists', name: 'Checklists', description: 'Actionable evaluation and procedural verification lists' },
  { id: 'calculators', name: 'Calculators', description: 'Financial modeling and cash flow calculation tools' },
  { id: 'other', name: 'Other', description: 'Miscellaneous educational resources and reference archives' },
];

export const RESOURCE_TYPES = [
  'Template',
  'Guide',
  'Checklist',
  'Calculator',
  'Framework',
  'Spreadsheet',
  'Roadmap',
  'Worksheet',
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];
