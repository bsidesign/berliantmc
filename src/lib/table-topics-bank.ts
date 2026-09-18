// Built-in bank of impromptu-speaking prompts. No backend needed — a random
// subset is drawn client-side each time "Generate" is pressed. If a theme is
// typed in, prompts that loosely match it are preferred first.
export const TABLE_TOPICS_BANK: string[] = [
  "What is one habit you'd like to break, and why haven't you yet?",
  "If you could have dinner with anyone, living or dead, who would it be and why?",
  "Describe a moment when you had to make a quick decision under pressure.",
  "What does leadership mean to you?",
  "If you won a free trip anywhere in the world, where would you go?",
  "What's the best piece of advice you've ever received?",
  "Innovation isn't always about creating something that immediately changes the world. Sometimes, it starts with a strange idea that makes people ask, \"Why would anyone need that?\"",
  "Describe your ideal weekend.",
  "What is a skill you wish you had learned earlier in life?",
  "If you could relive one day of your life, which day would it be?",
  "What does success mean to you personally?",
  "Talk about a time you overcame a fear.",
  "If you were mayor of your city for a day, what's the first thing you'd change?",
  "What's a book or movie that changed the way you think?",
  "Describe the most memorable meal you've ever had.",
  "What would you do with an unexpected day off work?",
  "If animals could talk, which animal would be the most annoying to have as a friend?",
  "What's one piece of technology you couldn't live without?",
  "Describe a time you had to adapt quickly to change.",
  "What is your favorite way to unwind after a long day?",
  "If you could instantly master any skill, what would you choose?",
  "What's the most valuable lesson your job has taught you?",
  "Talk about a tradition from your family or culture that means a lot to you.",
  "If you had to give a one-sentence motto for your life, what would it be?",
  "What's a small act of kindness you witnessed that stuck with you?",
  "Describe your dream job, and why it appeals to you.",
  "What is something you believed as a child that turned out to be wrong?",
  "If you could add one rule everyone in the world had to follow, what would it be?",
  "Talk about a time you had to speak up about something difficult.",
  "What's a hobby you'd like to pick up someday?",
];

export function randomTopics(count: number, seed?: string) {
  const pool = [...TABLE_TOPICS_BANK];
  const query = seed?.trim().toLowerCase();

  if (query) {
    pool.sort((a, b) => {
      const aMatch = a.toLowerCase().includes(query) ? 0 : 1;
      const bMatch = b.toLowerCase().includes(query) ? 0 : 1;
      return aMatch - bMatch;
    });
  }

  // Shuffle within (roughly) preserving preference for matches, then take N.
  const head = query ? pool.filter((t) => t.toLowerCase().includes(query)) : [];
  const rest = query ? pool.filter((t) => !t.toLowerCase().includes(query)) : pool;
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return [...head, ...rest].slice(0, count);
}
