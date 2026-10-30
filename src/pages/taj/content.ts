/**
 * TAJ Fencing Club — public copy from tajfencing.com (about, join, fencing, coaches).
 * No invented coaches, prices, or testimonials. Membership amount is the
 * figure Ari confirmed for the meeting (~$1,500). Billing cadence is unknown,
 * so it is never shown as /mo or /yr.
 */

export const TAJ_HANDLES = ["tajfencing", "taj_fencing", "taj-fencing", "taj"] as const;

export const ASSETS = {
  hero: "/taj/hero.jpg",
  logo: "/taj/logo.png",
  mark: "/taj/mark.png",
};

/** Quoted club membership. Not a Stripe price and not a monthly plan. */
export const MEMBERSHIP = {
  label: "Club membership",
  amount: 1500,
  priceLabel: "$1,500",
  display: "Club membership · $1,500",
  note: "Amount quoted by the club. Billing cadence is confirmed with TAJ Fencing Club — this page does not turn it into a monthly or annual plan.",
};

export const BRAND = {
  name: "TAJ Fencing Club",
  short: "TAJ",
  meaning: "Taj means Crown.",
  slogan: "Fence Your Limits",
  tagline: "Precision. Honor. Excellence.",
  premier: "Premier Épée Fencing in Reston, VA",
  address: "1914 Association Drive, Reston, VA 20191",
  phone: "+1 (202) 538-5363",
  phoneHref: "tel:+12025385363",
  email: "Tajfencingclub@gmail.com",
  emailHref: "mailto:Tajfencingclub@gmail.com",
  whatsapp: "https://wa.me/12025385363",
  instagram: "https://www.instagram.com/taj.fencing",
  linkedin: "https://www.linkedin.com/company/taj-fencing-club",
  facebook: "https://www.facebook.com/share/19GHiBhc2e/?mibextid=wwXIfr",
  site: "https://tajfencing.com",
  hours: [
    { day: "Monday – Friday", time: "3:00 PM – 9:30 PM" },
    { day: "Saturday", time: "9:00 AM – 2:00 PM" },
  ],
};

export const SOCIALS = [
  { label: "WhatsApp", href: BRAND.whatsapp },
  { label: "Instagram", href: BRAND.instagram },
  { label: "LinkedIn", href: BRAND.linkedin },
  { label: "Facebook", href: BRAND.facebook },
];

export const PROGRAMS = [
  {
    title: "Beginner Fencing",
    copy: "Learn the foundations of épée fencing in a supportive and engaging environment. Students develop coordination, focus, confidence, and fundamental technical skills.",
  },
  {
    title: "Intermediate Development",
    copy: "Build upon core skills through advanced footwork, tactical decision-making, and structured training designed to accelerate improvement.",
  },
  {
    title: "Competitive Training",
    copy: "For athletes seeking tournament success at the regional, national, and international levels. Training includes technical refinement, tactical preparation, and competition coaching.",
  },
  {
    title: "Private Lessons",
    copy: "Personalized one-on-one instruction tailored to each athlete's goals, strengths, and developmental needs.",
  },
  {
    title: "Adult Fencing",
    copy: "A dynamic program for adults looking to stay active, learn a unique sport, challenge themselves, and become part of a thriving fencing community.",
  },
];

export const WHO = [
  "Children Ages 5+",
  "Teens and Adults",
  "Beginner Fencers",
  "Intermediate and Advanced Athletes",
  "Competitive Fencers",
  "Students Seeking Private Instruction",
];

export const QUALITIES = [
  "Discipline",
  "Confidence",
  "Leadership",
  "Focus",
  "Respect",
  "Competitive Excellence",
  "A Lifelong Passion for Fencing",
];

export const VALUES = [
  {
    title: "Integrity First",
    copy: "We evaluate our athletes solely by their character, work ethic, and sportsmanship.",
  },
  {
    title: "Inclusivity & Diversity",
    copy: "Our doors are open to all cultures, creating a vibrant global community in America.",
  },
  {
    title: "Pursuit of Excellence",
    copy: "We strive for peak performance, elite coaching standards, and long-term success for our students.",
  },
];

/** Names and titles as published on tajfencing.com/coaches. */
export const TEAM = [
  {
    name: "Mosayeb Zarezadehmehrizi",
    role: "Co-Founder & Head Coach",
    detail: "Former National Fencing Team Coach",
    photo: "/taj/coach-mosayeb.jpg",
  },
  {
    name: "Mo Rezaei",
    role: "Co-Founder & Coach",
    detail: "Former National Fencing Team Member",
    photo: "/taj/coach-mo.jpg",
  },
  {
    name: "Matt Jafari",
    role: "Board Director",
    detail: "Board of Directors",
    photo: "/taj/coach-matt.jpg",
  },
  {
    name: "Rosie Taba",
    role: "Board Director",
    detail: "Board of Directors",
    photo: "/taj/coach-rosie.jpg",
  },
];

export type TajLesson = { slug: string; title: string; paragraphs: string[] };
export type TajModule = { slug: string; title: string; blurb: string; lessons: TajLesson[] };

export const MODULES: TajModule[] = [
  {
    slug: "the-crown",
    title: "The Crown",
    blurb: "Why the club is named Taj, and what that asks of everyone inside it.",
    lessons: [
      {
        slug: "the-name-taj",
        title: "The name Taj",
        paragraphs: [
          "The name “Taj” (meaning Crown) represents the highest echelon of respect, honor, and human dignity.",
          "Centuries ago, in an era overshadowed by injustice and chaos, Cyrus the Great penned the world’s first charter of human rights. It is our core belief that through this historic act, he placed an invisible “crown” of inherent worth, freedom, and nobility upon every human being—regardless of their race, background, or beliefs.",
          "We chose the name Taj to serve as a daily reminder that within our walls, every individual is the ruler of their own destiny and deserving of utmost respect.",
        ],
      },
      {
        slug: "the-mask-is-the-crown",
        title: "The mask is the crown",
        paragraphs: [
          "In the world of fencing, the mask you put on is not just protective gear; it is the crown you wear with pride, honor, and purpose.",
          "Earn your crown. In fencing. In life.",
        ],
      },
      {
        slug: "a-community-without-judgment",
        title: "A community without judgment",
        paragraphs: [
          "Today, in the heart of the United States, Taj Fencing Club bridges this ancient philosophy with the modern world. We have built a dynamic, international, and fully inclusive community where everyone—from children and youth to adults from all corners of the globe—can thrive side by side.",
          "Our mission is to cultivate a safe, elite, and non-judgmental environment. In our community, no one is defined by their background, ethnicity, or creed. We measure human value by only two standards: integrity in speech and excellence in conduct.",
        ],
      },
      {
        slug: "on-the-strip-and-in-life",
        title: "On the strip, and in life",
        paragraphs: [
          "On the strip: we provide world-class training, cutting-edge techniques, and a high-performance pathway designed to secure podium finishes and build strong athletic profiles for future academic success.",
          "In life: we shape individuals into leaders of character, integrity, resilience, and poise.",
          "At Taj, the path to excellence always runs through sportsmanship and humanity. We are here to help every athlete earn their crown—both in fencing and in life.",
        ],
      },
    ],
  },
  {
    slug: "epee",
    title: "Épée",
    blurb: "The weapon the club trains, and why it is called the chess of the human body.",
    lessons: [
      {
        slug: "chess-of-the-body",
        title: "The chess of the human body",
        paragraphs: [
          "While many people know the sport of fencing, few realize it consists of different disciplines. At our club, we specialize exclusively in Épée—the purest and most tactical form of fencing, often described as “the chess of the human body.”",
          "In Épée, the entire body—from head to toe—is a valid target. Unlike other fencing weapons, there are no complex priority rules; the fencer who hits first scores. If both land a touch at the exact same time, both receive a point.",
          "This makes Épée a brilliant, fast-paced game of strategic patience, instant physical analysis, and lightning-fast execution.",
        ],
      },
      {
        slug: "focus-and-resilience",
        title: "Focus and resilience",
        paragraphs: [
          "Because a split-second decision determines the point, athletes develop exceptional emotional intelligence, razor-sharp focus, and the confidence to perform under pressure.",
          "The logical, tactical nature of Épée allows dedicated young athletes to rapidly advance to the highest levels of national and international competition.",
        ],
      },
      {
        slug: "pathways",
        title: "Competitive pathways",
        paragraphs: [
          "Fencing Épée is far more than a sport; it is a premier investment in the future of both boys and girls.",
          "Fencing is one of the most prestigious collegiate sports in the United States. Elite universities—including the University of Notre Dame and Ivy League institutions like Harvard, Yale, and Columbia—boast varsity fencing teams. They actively award athletic and academic scholarships to standout épée fencers.",
          "Official tournament circuits begin as early as under 8 years old, teaching kids independence and a competitive spirit from an early age.",
        ],
      },
    ],
  },
  {
    slug: "beginner",
    title: "Beginner Fencing",
    blurb: "Foundations for athletes stepping on the strip for the first time.",
    lessons: [
      {
        slug: "foundations",
        title: "Foundations of épée",
        paragraphs: [
          "Learn the foundations of épée fencing in a supportive and engaging environment. Students develop coordination, focus, confidence, and fundamental technical skills.",
          "No previous fencing experience is required.",
        ],
      },
      {
        slug: "who-starts-here",
        title: "Who starts here",
        paragraphs: [
          "TAJ Fencing Club welcomes children ages 5+, teens and adults, beginner fencers, and anyone stepping onto the strip for the first time.",
          "Whether you are stepping onto the strip for the first time or pursuing competitive success, TAJ Fencing Club provides a professional training environment where athletes of all ages can develop confidence, discipline, and excellence through the sport of fencing.",
        ],
      },
      {
        slug: "equipment",
        title: "Equipment provided",
        paragraphs: [
          "New and beginner students are provided with fencing equipment during training sessions, making it easy to begin your fencing journey with confidence.",
        ],
      },
    ],
  },
  {
    slug: "intermediate",
    title: "Intermediate Development",
    blurb: "Footwork, tactics, and training that accelerates improvement.",
    lessons: [
      {
        slug: "footwork-and-tactics",
        title: "Footwork and tactics",
        paragraphs: [
          "Build upon core skills through advanced footwork, tactical decision-making, and structured training designed to accelerate improvement.",
          "Our structured programs are designed to support every stage of a fencer's journey—from beginner fundamentals to advanced competitive performance.",
        ],
      },
    ],
  },
  {
    slug: "competitive",
    title: "Competitive Training",
    blurb: "Preparation for regional, national, and international tournaments.",
    lessons: [
      {
        slug: "tournament-preparation",
        title: "Tournament preparation",
        paragraphs: [
          "For athletes seeking tournament success at the regional, national, and international levels. Training includes technical refinement, tactical preparation, and competition coaching.",
        ],
      },
    ],
  },
  {
    slug: "private-and-adult",
    title: "Private Lessons & Adult Fencing",
    blurb: "One-to-one instruction, and a program built for adults.",
    lessons: [
      {
        slug: "private-lessons",
        title: "Private lessons",
        paragraphs: [
          "Personalized one-on-one instruction tailored to each athlete's goals, strengths, and developmental needs.",
          "Students seeking private instruction are welcome.",
        ],
      },
      {
        slug: "adult-fencing",
        title: "Adult fencing",
        paragraphs: [
          "A dynamic program for adults looking to stay active, learn a unique sport, challenge themselves, and become part of a thriving fencing community.",
        ],
      },
    ],
  },
  {
    slug: "the-strip",
    title: "The Strip",
    blurb: "When the club trains, where it is, and how to begin.",
    lessons: [
      {
        slug: "schedule",
        title: "Training schedule",
        paragraphs: [
          "Monday – Friday: 3:00 PM – 9:30 PM.",
          "Saturday: 9:00 AM – 2:00 PM.",
        ],
      },
      {
        slug: "find-the-club",
        title: "Find the club",
        paragraphs: [
          "1914 Association Drive, Reston, VA 20191.",
          "Phone +1 (202) 538-5363. Email Tajfencingclub@gmail.com.",
        ],
      },
      {
        slug: "your-journey",
        title: "Your journey starts here",
        paragraphs: [
          "Send us your information or your child’s, along with your preferred class time, and we’ll recommend the best class for you.",
          "Our goal is to inspire every student to achieve their highest potential both on and off the strip.",
          "Precision. Honor. Excellence.",
        ],
      },
    ],
  },
];

export const LESSON_COUNT = MODULES.reduce((n, m) => n + m.lessons.length, 0);

export function findLesson(moduleSlug?: string, lessonSlug?: string) {
  const mod = MODULES.find((m) => m.slug === moduleSlug) ?? null;
  const lesson = mod?.lessons.find((l) => l.slug === lessonSlug) ?? null;
  return { mod, lesson };
}

export function lessonHref(moduleSlug: string, lessonSlug: string) {
  return `/taj/classroom/${moduleSlug}/${lessonSlug}`;
}

export function adjacentLessons(moduleSlug: string, lessonSlug: string) {
  const flat = MODULES.flatMap((m) => m.lessons.map((l) => ({ module: m, lesson: l })));
  const i = flat.findIndex((x) => x.module.slug === moduleSlug && x.lesson.slug === lessonSlug);
  return {
    prev: i > 0 ? flat[i - 1] : null,
    next: i >= 0 && i < flat.length - 1 ? flat[i + 1] : null,
    index: i,
    total: flat.length,
  };
}
