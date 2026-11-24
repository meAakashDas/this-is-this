export interface JournalEntry {
  id: string;
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  publishedAt: string;
  readTime: string;
  isSample: boolean;
  content: {
    lead: string;
    sections: {
      heading?: string;
      paragraphs: string[];
      quote?: string;
    }[];
  };
}

export const sampleJournalEntries: JournalEntry[] = [
  {
    id: '01',
    slug: 'why-i-believe-in-learning-in-public',
    title: 'Why I Believe in Learning in Public',
    category: 'Learning',
    excerpt:
      'When I first started creating educational notes on personal finance, I worried about not knowing enough. But documenting what I learn as I go has completely changed how I think, write, and retain ideas. Teaching forces clarity.',
    publishedAt: 'November 2024',
    readTime: '4 min read',
    isSample: true,
    content: {
      lead:
        'When I first started creating educational notes on personal finance, my biggest hesitation was feeling unqualified. I asked myself whether someone who is still studying and learning has any right to write explainers. What I discovered is that learning in public is not about claiming authority—it is about documenting curiosity with rigor and humility.',
      sections: [
        {
          heading: 'Teaching as a Learning Mechanism',
          paragraphs: [
            'There is an old observation attributed to Richard Feynman: if you cannot explain a concept to a beginner in simple terms, you do not truly understand it yourself. In personal finance, this becomes obvious very quickly. The financial industry is filled with jargon that often obscures basic mathematical truths.',
            'When I sit down to break down a concept—whether it is how compound interest works in an ordinary fixed deposit or how tax brackets apply to someone starting their first job—I am forced to identify every gap in my own logic. You cannot hide behind ambiguity when you are writing for an audience of peers.',
          ],
        },
        {
          heading: 'Honesty Over Performance',
          paragraphs: [
            'The internet often rewards the appearance of expertise. People feel pressured to present themselves as finished products with all the answers. But I have found that honesty is infinitely more sustainable. When I write "Here is what I currently understand, and here are the questions I am still exploring," it opens up genuine conversations.',
            'Learning in public invites feedback. Thoughtful readers point out edge cases, recommend better source material, and challenge underlying assumptions. That feedback loop accelerates understanding in a way that isolated private study never could.',
          ],
          quote:
            'You do not need to be at the destination to point out the trail markers you just passed.',
        },
        {
          heading: 'Building a Compounding Archive',
          paragraphs: [
            'Every essay, checklist, and spreadsheet I publish becomes a small permanent asset in an evolving intellectual portfolio. Looking back at work from six months ago allows me to measure personal growth with tangible evidence.',
            'For anyone hesitant to share their work: the goal is not to be the definitive voice on a topic. The goal is simply to be a reliable, thoughtful explorer documenting the journey with care.',
          ],
        },
      ],
    },
  },
  {
    id: '02',
    slug: 'building-something-that-matters',
    title: 'Building Something That Matters',
    category: 'Building',
    excerpt:
      'Building RisePaisa started from a simple frustration: financial information in Nepal was either overly academic or buried in difficult legal language. We wanted to build something clear, practical, and genuinely useful for everyday people.',
    publishedAt: 'October 2024',
    readTime: '5 min read',
    isSample: true,
    content: {
      lead:
        'Building RisePaisa started from a simple, personal frustration. Whenever friends, relatives, or classmates had questions about banking, taxes, or stock investing in Nepal, they faced a frustrating choice: either read through dense government acts and circulars, or rely on second-hand hearsay from social media. There was almost nothing in between.',
      sections: [
        {
          heading: 'The Gap in Financial Literacy',
          paragraphs: [
            'Nepal has witnessed incredible technological progress over the past five years. Almost everyone carries a smartphone, and QR-based digital payments have become an everyday convenience. Yet our educational system rarely teaches the foundational mechanics of money management.',
            'Many young people earn their first salary without knowing how social security deductions work, how income tax brackets are calculated, or what the difference is between saving and investing. We realized that access to digital money without financial education creates vulnerability rather than security.',
          ],
        },
        {
          heading: 'Designing for Practical Utility',
          paragraphs: [
            'When we conceptualized the resources for RisePaisa, our guiding rule was utility. An article that explains a financial concept is fine, but a practical budget framework spreadsheet or a step-by-step banking checklist that someone can actually download and use that afternoon is ten times more valuable.',
            'Designing these resources requires restraint. We strip away theoretical fluff and focus entirely on clarity. If a beginner cannot understand the first two paragraphs, the explanation has failed, no matter how technically accurate it might be.',
          ],
          quote:
            'Simplicity is not the absence of depth; it is the mastery of clarity.',
        },
        {
          heading: 'The Patience Required to Build',
          paragraphs: [
            'Creating educational tools is not a fast game. There are no sudden viral shortcuts to earning trust. It requires consistently researching regulations, verifying numbers with qualified practitioners, and iterating based on how real people use the tools.',
            'Building something that matters in Nepal means choosing steady, patient compounding over short-term vanity metrics. Every person who makes a better financial decision because of a guide we published makes the effort worthwhile.',
          ],
        },
      ],
    },
  },
  {
    id: '03',
    slug: 'where-finance-meets-technology',
    title: 'Where Finance Meets Technology',
    category: 'Finance & Tech',
    excerpt:
      "Nepal's shift from cash to QR codes and digital wallets happened faster than anyone predicted. Yet digital payments are only the foundation. The real opportunity lies in bridging digital access with actual financial literacy.",
    publishedAt: 'September 2024',
    readTime: '4 min read',
    isSample: true,
    content: {
      lead:
        "If you walk through the streets of Kathmandu today, you will see QR payment stands at tea stalls, grocery vendors, and tempo drivers. The speed at which Nepal transitioned from cash-dominated commerce to seamless digital transactions is one of the most remarkable stories of technological adoption in South Asia.",
      sections: [
        {
          heading: 'Infrastructure Outpacing Understanding',
          paragraphs: [
            'While our transactional infrastructure has leapfrogged ahead, our collective financial understanding remains in its early stages. Frictionless payments make spending money easier than ever before. When transactions were physical, counting paper notes created a natural psychological pause. Digital payments remove that friction entirely.',
            'Without disciplined personal accounting habits, digital convenience can inadvertently lead to higher lifestyle inflation and unmonitored expenditure. The technology has evolved, but human behavioral psychology remains unchanged.',
          ],
        },
        {
          heading: 'The Next Wave of Nepali Fintech',
          paragraphs: [
            'The first era of fintech in Nepal was defined by rails: payment gateways, wallet integrations, and digital inter-bank transfers. That was necessary groundwork, and companies like Fonepay, eSewa, and Khalti built that foundation admirably.',
            'I believe the next era will be defined by intelligence and guidance. How can software help a small business owner forecast cash flow? How can digital tools help a college student automate disciplined savings? How can retail investors analyze NEPSE company filings with clean, structured interfaces instead of clunky PDFs?',
          ],
          quote:
            'The true promise of fintech is not making spending faster; it is making financial well-being accessible.',
        },
        {
          heading: 'Why This Matters for Young Builders',
          paragraphs: [
            'For students and engineers working in Nepal today, the intersection of finance and software offers an immense frontier. We do not need to simply clone foreign products. We have unique regulatory frameworks, cooperative banking networks, and cultural remittance dynamics that demand custom, home-grown solutions.',
            'Exploring this intersection is one of the primary reasons I study information technology while working in financial education. Software is the highest-leverage lever we have to democratize knowledge.',
          ],
        },
      ],
    },
  },
  {
    id: '04',
    slug: 'the-value-of-being-a-beginner',
    title: 'The Value of Being a Beginner',
    category: 'Personal Growth',
    excerpt:
      'There is a distinct advantage in being a beginner: you ask the questions that experienced people often overlook. Embracing the discomfort of starting from scratch has been the most reliable driver of my own growth.',
    publishedAt: 'August 2024',
    readTime: '3 min read',
    isSample: true,
    content: {
      lead:
        'Starting anything new involves an uncomfortable period of awkward incompetence. When you begin writing, your prose feels stiff. When you start coding, simple syntax errors consume hours. When you study a new domain, the sheer volume of unfamiliar terminology can feel intimidating. Most people stop here to protect their egos.',
      sections: [
        {
          heading: 'The Beginner’s Advantage',
          paragraphs: [
            'Zen philosophy speaks of "shoshin"—the beginner’s mind. In the beginner’s mind there are many possibilities, but in the expert’s mind there are few. When you have not yet formed rigid habits or dogmatic beliefs about how things "must" be done, you look at problems with fresh eyes.',
            'In my own journey transitioning from accounting studies towards computer science and digital content creation, being a novice forced me to break everything down to first principles. I could not rely on memorized scripts; I had to understand the underlying mechanisms.',
          ],
        },
        {
          heading: 'Consistency Over Intensity',
          paragraphs: [
            'Early in any pursuit, there is a temptation to attempt heroic bursts of effort: studying for fourteen hours straight or attempting an ambitious project in a single weekend. Almost always, this leads to burnout and quiet abandonment.',
            'What actually compounds is quiet, unglamorous consistency. Reading for forty-five minutes every morning, writing one thoughtful page, or debugging one function daily creates an exponential curve that is invisible in the short run but unstoppable over three years.',
          ],
          quote:
            'Patience with the process; impatience with daily action.',
        },
        {
          heading: 'Long-Term Games in a Short-Term World',
          paragraphs: [
            'Our digital environment constantly tempts us into short-term comparison. We see someone else’s highlight reel and feel behind. But when you adopt a decade-long horizon, the urgency to prove yourself today fades.',
            'Being a beginner is not a temporary weakness to be hurried through; it is an active posture of curiosity that keeps you adaptable for the rest of your life.',
          ],
        },
      ],
    },
  },
];

export function getAllJournalArticles(): JournalEntry[] {
  return sampleJournalEntries;
}

export function getJournalArticleBySlug(slug: string): JournalEntry | undefined {
  return sampleJournalEntries.find((entry) => entry.slug === slug);
}

export function getAllJournalSlugs(): string[] {
  return sampleJournalEntries.map((entry) => entry.slug);
}

export function getAdjacentJournalArticles(slug: string): {
  prev?: JournalEntry;
  next?: JournalEntry;
} {
  const index = sampleJournalEntries.findIndex((entry) => entry.slug === slug);
  if (index === -1) return { prev: undefined, next: undefined };

  const prev = index > 0 ? sampleJournalEntries[index - 1] : undefined;
  const next =
    index < sampleJournalEntries.length - 1
      ? sampleJournalEntries[index + 1]
      : undefined;

  return { prev, next };
}
