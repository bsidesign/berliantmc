// Built-in bank of impromptu-speaking prompts. No backend or AI needed —
// everything runs client-side.
//
// When the Topics Master types a theme (e.g. "childhood crush"), we don't
// have an AI to write a brand-new question about it — instead we drop the
// theme into a set of question templates ("Tell us about a memorable
// moment involving {theme}.") so every generated topic is actually about
// what was typed. With no theme, we fall back to the generic hand-written
// bank below.
//
// To keep repeated generations feeling fresh (rather than cycling through
// the same handful of lines), both banks are large and randomTopics()
// tracks which lines were already shown this session, avoiding any repeat
// until the whole bank has been used once.
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
  "If {theme} had a theme song, what would it be and why?",
  "What's the biggest myth about {theme} that you'd like to bust?",
  "Describe {theme} to someone who has never heard of it before.",
  "What's one question you've always wanted to ask an expert on {theme}?",
  "If you had unlimited resources, how would you improve {theme}?",
  "What's a small win related to {theme} that you're proud of?",
  "How do different generations seem to approach {theme} differently?",
  "What's a rule of thumb you follow when it comes to {theme}?",
  "If {theme} disappeared tomorrow, what would you miss most?",
  "What's something about {theme} that people rarely talk about?",
  "Describe a turning point involving {theme} in your life.",
  "What's the connection between {theme} and happiness, in your opinion?",
  "If you were teaching a class on {theme}, what's the first thing you'd cover?",
  "What's a habit related to {theme} you're trying to build or break?",
  "Share a piece of wisdom about {theme} that was passed down to you.",
  "What's the biggest challenge people face with {theme} today?",
  "If {theme} could talk, what do you think it would say about you?",
  "What's a moment when {theme} surprised you in a good way?",
  "How does {theme} show up differently across cultures, in your experience?",
  "What's one goal you have related to {theme} for this year?",
  "Describe the last conversation you had about {theme}.",
  "What's a question about {theme} you wish more people asked?",
  "If you had to bet on how {theme} evolves in the next five years, what would you predict?",
  "What's something you'd tell a beginner about {theme}?",
  "Share a memory of {theme} from your childhood.",
  "What's the funniest misunderstanding you've had about {theme}?",
  "If {theme} were a color, what would it be and why?",
  "What's a piece of {theme}-related advice you disagree with?",
  "How do you recharge when {theme} feels overwhelming?",
  "What's one thing about {theme} you'd change if you had a magic wand?",
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
  "What's a rule you think everyone should live by?",
  "Describe a time a stranger's kindness surprised you.",
  "If you could master a new language overnight, which would you pick and why?",
  "What's the most useless talent you have?",
  "Describe a moment you felt truly proud of yourself.",
  "If you could swap lives with anyone for a week, who would it be?",
  "What's a childhood memory that still makes you laugh?",
  "Talk about a risk you took that paid off.",
  "What's one thing on your bucket list you're determined to do?",
  "Describe the best piece of feedback you've ever received.",
  "If you could invent something to solve an everyday annoyance, what would it be?",
  "What's a tradition you'd like to start with your own family or friends?",
  "Talk about a time you had to trust your gut instinct.",
  "What does 'home' mean to you?",
  "If you had an extra hour every day, how would you spend it?",
  "Describe your first job and what it taught you.",
  "What's a compliment that stuck with you for years?",
  "Talk about a time you helped someone without being asked.",
  "What's the best gift you've ever given or received?",
  "If you could time travel to witness one event in history, what would it be?",
  "What's a question you wish people asked you more often?",
  "Describe a place that feels like magic to you.",
  "What's something you changed your mind about recently?",
  "Talk about a mentor who made a big impact on your life.",
  "If you could only eat one meal for the rest of your life, what would it be?",
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Picks `count` items from `pool`, preferring ones not in `used` so a
// second (or third, or tenth) generation doesn't just re-show the same
// lines in a new order. Once the pool's been exhausted, `used` is reset so
// the rotation starts over instead of running dry.
function pickUnique(pool: string[], count: number, used: Set<string>): string[] {
  let available = pool.filter((item) => !used.has(item));
  if (available.length < count) {
    used.clear();
    available = pool;
  }

  const picked = shuffle(available).slice(0, Math.min(count, pool.length));
  picked.forEach((item) => used.add(item));
  return picked;
}

/**
 * `used` is a Set the caller keeps around across generations (for example,
 * in a useRef in the component) so this function can avoid repeats. Pass a
 * fresh empty Set to get the old "pure random" behavior back.
 */
export function randomTopics(count: number, theme: string | undefined, used: Set<string>) {
  const trimmed = theme?.trim();

  if (trimmed) {
    const filled = THEME_TEMPLATES.map((template) => template.replace(/\{theme\}/g, trimmed));
    return pickUnique(filled, count, used);
  }

  return pickUnique(TABLE_TOPICS_BANK, count, used);
}