// Built-in bank of impromptu-speaking prompts. No backend or AI needed —
// everything runs client-side.
//
// When the Topics Master types a theme (e.g. "childhood crush"), we don't
// have an AI to write a brand-new question about it — instead we drop the
// theme into a set of question templates ("Tell us about a memorable
// moment involving {theme}.") so every generated topic is actually about
// what was typed. With no theme, we fall back to the generic hand-written
// bank below.
const THEME_TEMPLATES: string[] = [
  "Tell us about a memorable moment involving {theme}.",
  "What's the funniest experience you've had with {theme}?",
  "If you could change one thing about {theme}, what would it be?",
  "Describe how {theme} has shaped who you are today.",
  "What's the best lesson you've learned from {theme}?",
  "Share a story about {theme} that still makes you smile.",
  "What advice would you give someone experiencing {theme} for the first time?",
  "How do you think {theme} will look ten years from now?",
  "What's a common misconception people have about {theme}?",
  "Describe {theme} in three words, and explain why.",
  "What's the most surprising thing you've learned about {theme}?",
  "If {theme} were a movie, what genre would it be, and why?",
  "Talk about a time {theme} completely changed your perspective.",
  "What's one thing you wish more people understood about {theme}?",
  "How has your view of {theme} changed over the years?",
  "Share your most embarrassing story related to {theme}.",
  "What's a piece of advice about {theme} you'd give your younger self?",
  "Describe the first time you experienced {theme}.",
  "If you had to give a one-minute talk introducing {theme} to a stranger, what would you say?",
  "What role does {theme} play in your everyday life?",
];

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

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function randomTopics(count: number, theme?: string) {
  const trimmed = theme?.trim();

  if (trimmed) {
    return shuffle(THEME_TEMPLATES)
      .slice(0, count)
      .map((template) => template.replace(/\{theme\}/g, trimmed));
  }

  return shuffle(TABLE_TOPICS_BANK).slice(0, count);
}