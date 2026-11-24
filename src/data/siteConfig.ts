import type { SiteConfig } from '../types';

export const siteConfig: SiteConfig = {
  name: 'Aakash Das',
  title: 'Aakash Das',
  description:
    'Personal website of Aakash Das. Studying Information Technology at Softwarica College and building RisePaisa. Exploring technology, finance, productivity, and digital products.',
  url: 'https://aakashdas.live',
  identity: 'me.aakashdas',
  location: 'Kathmandu, Nepal',
  email: 'contact@aakashdas.live',
  // Direct Contact Configuration:
  // Verified phone number was not found in the repository.
  // Below is a clearly identifiable configuration placeholder.
  // Replace with Aakash's verified phone number (e.g. '+977-98XXXXXXXX')
  phone: '+977-XXXXXXXXXX',
  whatsappNumber: '977XXXXXXXXXX',
  tagline: 'Building, learning and sharing along the way.',
  positioning:
    'Personal archive, educational resources, and writing by Aakash Das.',

  navItems: [
    { label: 'Home', href: '/' },
    { label: 'About', href: '/about' },
    { label: 'Resources', href: '/resources' },
    { label: 'Journal', href: '/journal' },
  ],

  socialLinks: [
    {
      platform: 'Instagram',
      label: 'Instagram',
      handle: '@me.aakashdas',
      url: 'https://instagram.com/me.aakashdas',
      icon: 'instagram',
      featured: true,
    },
    {
      platform: 'YouTube',
      label: 'YouTube',
      handle: '@me.aakashdas',
      url: 'https://youtube.com/@me.aakashdas',
      icon: 'youtube',
      featured: true,
    },
    {
      platform: 'TikTok',
      label: 'TikTok',
      handle: '@me.aakashdas',
      url: 'https://tiktok.com/@me.aakashdas',
      icon: 'tiktok',
      featured: true,
    },
    {
      platform: 'LinkedIn',
      label: 'LinkedIn',
      handle: 'me.aakashdas',
      url: 'https://linkedin.com/in/me-aakashdas',
      icon: 'linkedin',
      featured: true,
    },
    {
      platform: 'X (Twitter)',
      label: 'X',
      handle: '@me_aakashdas',
      url: 'https://x.com/me_aakashdas',
      icon: 'twitter',
      featured: true,
    },
    {
      platform: 'Facebook',
      label: 'Facebook',
      handle: 'me.aakashdas',
      url: 'https://facebook.com/me.aakashdas',
      icon: 'facebook',
      featured: true,
    },
  ],

  projects: [
    {
      id: 'risepaisa',
      title: 'RisePaisa',
      role: 'Founder & Creator',
      period: '2024 — Present',
      description:
        'A Nepal-focused financial education initiative simplifying money management, smart banking, personal investing, and economic awareness for Nepali youth.',
      tags: ['Financial Literacy', 'Content Initiative', 'Nepal'],
      url: 'https://risepaisa.com',
      isExternal: true,
      status: 'active',
    },
    {
      id: 'it-studies',
      title: 'Technology & Computing',
      role: 'Student & Developer',
      period: 'Ongoing',
      description:
        'Pursuing an undergraduate degree in Information Technology at Softwarica College of IT & E-Commerce in Kathmandu. Focused on web architecture, software systems, and data-driven applications.',
      tags: ['Information Technology', 'Software Engineering', 'Softwarica'],
      status: 'active',
    },
    {
      id: 'educational-resources',
      title: 'Open Educational Resources',
      role: 'Author & Curator',
      period: '2025 — Present',
      description:
        'Creating structured reference guides, financial calculators, worksheets, and study templates assigned permanent resource numbers for open public access.',
      tags: ['Open Education', 'Templates', 'Productivity'],
      url: '/resources',
      isExternal: false,
      status: 'in-progress',
    },
  ],
};
