import type { AboutData } from '../types';

export const aboutData: AboutData = {
  title: 'About Me',
  lead: "I'm Aakash Das, an IT student and finance educator from Nepal. I build, learn, and share ideas at the intersection of finance and technology.",

  introParagraphs: [
    "I'm Aakash Das, an IT student and finance educator from Nepal. I’m interested in building useful things and making complex ideas easier to understand.",
    'I study Information Technology at Softwarica College and run RisePaisa, where I create practical financial education content for Nepali audiences.',
  ],

  story: [
    {
      number: '01',
      title: 'Science Education',
      paragraph:
        'I completed my higher secondary education in Science. This gave me a foundation in analytical thinking, mathematics, and problem-solving.',
    },
    {
      number: '02',
      title: 'Exploring Finance',
      paragraph:
        'I later pursued Chartered Accountancy, where I developed an understanding of accounting, taxation, and financial systems. This experience strengthened my interest in how finance affects everyday decisions.',
    },
    {
      number: '03',
      title: 'Moving Into Technology',
      paragraph:
        'I eventually shifted my focus toward Information Technology. I am currently studying at Softwarica College of IT & E-Commerce, exploring software development, web technologies, and digital systems.',
    },
    {
      number: '04',
      title: 'Bringing It Together',
      paragraph:
        'Today, I combine my interests in finance and technology through RisePaisa and my personal projects. I want to make useful knowledge and digital tools easier for people to access.',
    },
  ],

  activities: [
    {
      id: 'risepaisa',
      title: 'RisePaisa',
      description:
        'I founded RisePaisa to make financial knowledge more practical and accessible for people in Nepal.',
      url: 'https://risepaisa.com/',
      linkText: 'Visit RisePaisa',
      isExternal: true,
    },
    {
      id: 'technology-development',
      title: 'Technology & Development',
      description:
        'I study Information Technology and build websites, digital tools, and practical software projects.',
    },
    {
      id: 'educational-resources',
      title: 'Educational Resources',
      description:
        'I create and share study materials, guides, templates, and useful resources that anyone can access.',
      url: '/resources',
      linkText: 'Explore Resources',
      isExternal: false,
    },
  ],
};
