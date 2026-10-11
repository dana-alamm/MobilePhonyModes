import {
  EXTRA_ASSESSMENTS, EXTRA_RECOMMENDATIONS, EXTRA_TECH_OFFICIAL, EXTRA_TECH_PRACTICE,
} from "./content-extra.js";

// Hardcoded question banks. Assessments and practice questions are fixed lists (not AI generated).
// Each selectable skill maps to a question family ("bank"); see bankOf().
type BaseBank = "Flutter Developer" | "UI/UX Designer" | "Frontend Developer" | "Backend Developer";
export type Track = string;

export interface McqQuestion {
  q: string;
  options: string[];
  answer: number;
}

export const ASSESSMENTS: Record<BaseBank, McqQuestion[]> = {
  "Flutter Developer": [
    { q: "Which programming language is used to write Flutter apps?", options: ["Kotlin", "Swift", "Dart", "JavaScript"], answer: 2 },
    { q: "Which widget type can hold mutable state that changes during its lifetime?", options: ["StatelessWidget", "StatefulWidget", "Container", "SizedBox"], answer: 1 },
    { q: "Which method tells Flutter to rebuild a StatefulWidget after state changes?", options: ["rebuild()", "refresh()", "setState()", "notify()"], answer: 2 },
    { q: "Which keyword marks a Dart function that returns a Future and can use await?", options: ["async", "defer", "thread", "promise"], answer: 0 },
    { q: "Which of these is a popular Flutter state management package?", options: ["Redux Toolkit", "Provider", "Vuex", "Pinia"], answer: 1 },
    { q: "Which widget lays out its children vertically?", options: ["Row", "Stack", "Column", "Wrap"], answer: 2 },
    { q: "What is the main purpose of pubspec.yaml?", options: ["Declare dependencies and assets", "Store app screenshots", "Configure the database server", "Write unit tests"], answer: 0 },
    { q: "What does the await keyword do inside an async function?", options: ["Starts a new isolate", "Cancels the Future", "Pauses that function until the Future completes", "Blocks the whole UI thread"], answer: 2 },
    { q: "What does hot reload do?", options: ["Restarts the device", "Injects updated code while preserving app state", "Rebuilds the APK", "Clears all caches"], answer: 1 },
    { q: "Which widget builds a long scrollable list lazily, only for visible items?", options: ["ListView.builder", "Column", "Table", "Row"], answer: 0 },
  ],
  "UI/UX Designer": [
    { q: "What is a heuristic evaluation?", options: ["A load test of the server", "Experts reviewing an interface against usability principles", "A survey of 1,000 customers", "A color-palette audit"], answer: 1 },
    { q: "What is a wireframe?", options: ["A finished high-fidelity mockup", "A low-fidelity layout blueprint of a screen", "A database diagram", "A brand logo sketch"], answer: 1 },
    { q: "What does visual hierarchy do?", options: ["Hides secondary content", "Guides attention using size, contrast and position", "Makes every element equally prominent", "Reduces page load time"], answer: 1 },
    { q: "What is the WCAG AA minimum contrast ratio for normal body text?", options: ["2:1", "3:1", "4.5:1", "10:1"], answer: 2 },
    { q: "What is a user persona?", options: ["A real customer's private data", "A fictional representation of a target user based on research", "A login account type", "A visual theme"], answer: 1 },
    { q: "What is the goal of usability testing?", options: ["Check the code compiles", "Observe real users attempting tasks to find problems", "Pick the brand colors", "Measure server speed"], answer: 1 },
    { q: "According to Fitts's law, what affects the time to reach a target?", options: ["Its color only", "Its distance and size", "The font used", "The number of pages"], answer: 1 },
    { q: "What is an affordance?", options: ["A pricing tier", "A visual cue that suggests how an element can be used", "A type of animation library", "A legal requirement"], answer: 1 },
    { q: "Why add alt text to images?", options: ["To speed up SEO crawling only", "To describe images for screen reader users", "To compress images", "To change image color"], answer: 1 },
    { q: "Which technique helps organize information architecture by letting users group content?", options: ["A/B testing", "Card sorting", "Heat mapping", "Gradient mapping"], answer: 1 },
  ],
  "Frontend Developer": [
    { q: "Which CSS property sets the main axis direction in a flex container?", options: ["flex-flow-x", "flex-direction", "align-main", "display-direction"], answer: 1 },
    { q: "What does === do in JavaScript?", options: ["Assigns a value", "Compares values without type coercion", "Compares values with type coercion", "Declares a constant"], answer: 1 },
    { q: "Which React hook adds local state to a function component?", options: ["useRef", "useMemo", "useState", "useId"], answer: 2 },
    { q: "Which HTML element is the semantic choice for a block of navigation links?", options: ["<div>", "<nav>", "<section>", "<span>"], answer: 1 },
    { q: "What is event bubbling?", options: ["Events propagating from the target up through its ancestors", "Events being cancelled", "Events firing twice", "Events moving to sibling nodes"], answer: 0 },
    { q: "What does declaring a variable with const mean?", options: ["Its object contents are frozen", "It is a block-scoped binding that cannot be reassigned", "It is global", "It is hoisted as undefined"], answer: 1 },
    { q: "When does useEffect with an empty dependency array run?", options: ["On every render", "Once after the first render", "Never", "Only when props change"], answer: 1 },
    { q: "Which lists the layers of the CSS box model from inside to outside?", options: ["Margin, border, padding, content", "Content, padding, border, margin", "Padding, content, margin, border", "Border, content, margin, padding"], answer: 1 },
    { q: "Which browser storage persists after the browser is closed?", options: ["sessionStorage", "localStorage", "Memory variables", "The call stack"], answer: 1 },
    { q: "What does Promise.all do?", options: ["Runs promises one at a time", "Resolves when all promises resolve and rejects if any rejects", "Ignores rejected promises", "Cancels pending promises"], answer: 1 },
  ],
  "Backend Developer": [
    { q: "Which HTTP status code means a resource was created?", options: ["200", "201", "301", "404"], answer: 1 },
    { q: "What is the most effective defence against SQL injection?", options: ["Hiding the database port", "Parameterized queries", "Longer table names", "Client-side validation only"], answer: 1 },
    { q: "How should passwords be stored?", options: ["Plain text", "Base64 encoded", "As a salted hash using bcrypt or argon2", "Encrypted with a key kept in the client"], answer: 2 },
    { q: "In REST, what should a GET request do?", options: ["Modify data", "Be safe and not change server state", "Delete data", "Always return 204"], answer: 1 },
    { q: "What does a primary key do?", options: ["Encrypts a row", "Uniquely identifies each row in a table", "Sorts the table alphabetically", "Links two databases"], answer: 1 },
    { q: "What is a JWT?", options: ["A SQL dialect", "A signed token carrying claims", "A web server", "A caching layer"], answer: 1 },
    { q: "What is the trade-off of adding a database index?", options: ["Faster reads, but slower writes and extra storage", "Faster writes only", "No trade-off", "Slower reads"], answer: 0 },
    { q: "What is the difference between HTTP 401 and 403?", options: ["They are identical", "401 = not authenticated, 403 = authenticated but not allowed", "401 = not found, 403 = server error", "401 = redirect, 403 = created"], answer: 1 },
    { q: "Where must request input always be validated?", options: ["Only in the browser", "On the server", "Only in the database", "Nowhere if the UI is trusted"], answer: 1 },
    { q: "What does the 'A' in ACID transactions (atomicity) guarantee?", options: ["Queries are fast", "A transaction is all-or-nothing", "Data is archived", "Tables are auto-created"], answer: 1 },
  ],
};

export const HR_OFFICIAL: string[] = [
  "Please introduce yourself and tell us a little about your background.",
  "Why did you choose this career path, and what motivates you in it?",
  "Tell us about a project you are proud of and what your role in it was.",
  "Describe a time you faced a difficult problem or disagreement in a team. How did you handle it?",
  "Where do you see yourself in three years, and what would you like to learn next?",
];

export const HR_PRACTICE: string[] = [
  "Tell us about yourself in under a minute.",
  "What is your biggest strength, and how has it helped you?",
  "How do you handle tight deadlines or pressure?",
];

export const TECH_OFFICIAL: Record<BaseBank, string[]> = {
  "Flutter Developer": [
    "Explain the difference between StatelessWidget and StatefulWidget, and when you would use each.",
    "How do you manage state in a Flutter app? Compare setState with a solution like Provider or Bloc.",
    "Explain how async and await work in Dart and how Futures and Streams differ.",
    "Describe the widget lifecycle of a StatefulWidget from creation to disposal.",
    "How would you structure a Flutter app that calls a REST API and handles loading and error states?",
  ],
  "UI/UX Designer": [
    "Walk us through your design process from research to final handoff.",
    "How do you conduct user research, and how do you turn findings into design decisions?",
    "How do you build visual hierarchy on a screen? Give a concrete example.",
    "How do you make a design accessible? Mention contrast, labels and keyboard use.",
    "Describe a time a usability test changed your design. What did you learn?",
  ],
  "Frontend Developer": [
    "Explain how the virtual DOM and rendering work in React and why keys matter in lists.",
    "What is the difference between useEffect, useMemo and useCallback? When would you use each?",
    "Explain the CSS box model and how flexbox and grid differ.",
    "How does the browser event loop work, and how do promises and async await fit in?",
    "How would you debug a page that is slow to load or a component that re-renders too often?",
  ],
  "Backend Developer": [
    "How would you design a REST API for a resource, including status codes and validation?",
    "Explain how you would implement authentication and authorization for an API.",
    "How do you model data in a relational database, and when would you add an index?",
    "What is a database transaction and why does it matter? Give an example.",
    "How would you handle errors, logging and rate limiting in a production server?",
  ],
};

export const TECH_PRACTICE: Record<BaseBank, string[]> = {
  "Flutter Developer": [
    "What is the widget tree in Flutter?",
    "What does hot reload do and how is it different from hot restart?",
  ],
  "UI/UX Designer": [
    "What is the difference between UX design and UI design?",
    "What is a wireframe and when do you create one?",
  ],
  "Frontend Developer": [
    "What is the difference between let, const and var in JavaScript?",
    "What is a React component and what are props?",
  ],
  "Backend Developer": [
    "What is the difference between SQL and NoSQL databases?",
    "What is middleware in a web server?",
  ],
};

export const LEARNING_RECOMMENDATIONS: Record<BaseBank, { title: string; topics: string[]; url: string }[]> = {
  "Flutter Developer": [
    { title: "Dart Programming fundamentals", topics: ["Dart syntax", "async / await", "Futures and Streams"], url: "https://www.udemy.com/topic/dart/" },
    { title: "Flutter widgets and layouts", topics: ["Stateless vs Stateful widgets", "Column / Row / ListView"], url: "https://www.udemy.com/topic/flutter/" },
    { title: "Flutter state management", topics: ["setState", "Provider", "Bloc"], url: "https://www.udemy.com/topic/flutter/" },
  ],
  "UI/UX Designer": [
    { title: "UX research and usability testing", topics: ["Personas", "Usability tests", "Card sorting"], url: "https://www.udemy.com/topic/user-experience-design/" },
    { title: "UI design fundamentals", topics: ["Visual hierarchy", "Typography and color", "Contrast"], url: "https://www.udemy.com/topic/ui-design/" },
    { title: "Accessibility for designers", topics: ["WCAG", "Alt text", "Keyboard navigation"], url: "https://www.udemy.com/topic/web-accessibility/" },
  ],
  "Frontend Developer": [
    { title: "Modern JavaScript", topics: ["Scope and const / let", "Promises and async", "Equality and coercion"], url: "https://www.udemy.com/topic/javascript/" },
    { title: "React fundamentals", topics: ["Hooks", "Component state", "Effects"], url: "https://www.udemy.com/topic/react/" },
    { title: "HTML and CSS", topics: ["Semantic HTML", "Box model", "Flexbox and Grid"], url: "https://www.udemy.com/topic/css/" },
  ],
  "Backend Developer": [
    { title: "REST API design", topics: ["HTTP methods", "Status codes", "Validation"], url: "https://www.udemy.com/topic/rest-api/" },
    { title: "SQL and databases", topics: ["Keys and indexes", "Transactions", "Injection prevention"], url: "https://www.udemy.com/topic/sql/" },
    { title: "Authentication and security", topics: ["Password hashing", "JWT", "401 vs 403"], url: "https://www.udemy.com/topic/web-security/" },
  ],
};

export const LIMITS = {
  passMark: 5,
  assessmentMinutes: 15,
  assessmentGraceSeconds: 30,
  freePracticeSessions: 2,
  practiceMinutes: 10,
  hrMinutes: 10,
  techMinutes: 15,
  initiationSeconds: 15,
  answerSeconds: 60,
  // Allows for text-to-speech reading time and network latency before the answer window.
  questionGraceSeconds: 25,
  maxRepeatsPerQuestion: 1,
  priceJod: 1,
  basicInviteLimit: 5,
};

export const SKILL_GROUPS: { group: string; skills: string[] }[] = [
  { group: "Software & Web Development", skills: ["Frontend Development", "Backend Development", "Full-Stack Development", "React.js", "Angular", "Vue.js", "Node.js", "Python (Django/Flask)", "Java (Spring)", "C# (.NET)", "PHP (Laravel)", "Ruby on Rails", "Go (Golang)", "HTML/CSS/JavaScript"] },
  { group: "Mobile App Development", skills: ["Mobile App Development", "Flutter & Dart", "React Native", "iOS Development (Swift)", "Android Development (Kotlin)"] },
  { group: "Data, AI & Machine Learning", skills: ["Data Science", "Machine Learning", "Artificial Intelligence", "Data Analytics", "Business Intelligence", "Deep Learning", "Data Engineering", "SQL", "NoSQL (MongoDB)", "Pandas & NumPy", "TensorFlow & PyTorch"] },
  { group: "Cloud Computing & DevOps", skills: ["Cloud Engineering", "DevOps", "AWS Solutions Architecture", "Microsoft Azure", "Google Cloud (GCP)", "Docker & Containers", "Kubernetes", "CI/CD Pipelines", "Linux Administration"] },
  { group: "Cybersecurity & Networking", skills: ["Cybersecurity", "Ethical Hacking", "Penetration Testing", "Network Security", "Information Security", "Cryptography", "Network Administration"] },
  { group: "UI/UX & Product Design", skills: ["UI/UX Design", "Product Design", "Figma", "Adobe XD", "User Research", "Interaction Design"] },
  { group: "Systems, QA & Management", skills: ["Quality Assurance (QA) Testing", "Automated Testing", "Systems Architecture", "Systems Analysis", "Software Engineering", "Product Management", "Scrum Master / Agile", "Business Analysis"] },
];
export const SKILLS: string[] = SKILL_GROUPS.flatMap((g) => g.skills);
export const isSkill = (s: string) => SKILLS.includes(s);

const BANK_BY_GROUP: Record<string, string> = {
  "Mobile App Development": "Mobile Development",
  "Data, AI & Machine Learning": "Data & AI",
  "Cloud Computing & DevOps": "Cloud & DevOps",
  "Cybersecurity & Networking": "Cybersecurity & Networking",
  "UI/UX & Product Design": "UI/UX Designer",
  "Software & Web Development": "Backend Developer",
};
const FRONTEND = new Set(["Frontend Development", "Full-Stack Development", "React.js", "Angular", "Vue.js", "HTML/CSS/JavaScript"]);
const QA = new Set(["Quality Assurance (QA) Testing", "Automated Testing"]);

// The question family a skill is assessed with.
export function bankOf(skill: string): string {
  const g = SKILL_GROUPS.find((x) => x.skills.includes(skill));
  if (!g) throw new Error(`Unknown skill: ${skill}`);
  if (skill === "Flutter & Dart") return "Flutter Developer";
  if (FRONTEND.has(skill)) return "Frontend Developer";
  if (g.group === "Systems, QA & Management") return QA.has(skill) ? "QA & Testing" : "Systems & Product";
  return BANK_BY_GROUP[g.group];
}

const ALL_ASSESSMENTS: Record<string, McqQuestion[]> = { ...ASSESSMENTS, ...EXTRA_ASSESSMENTS };
const ALL_TECH_OFFICIAL: Record<string, string[]> = { ...TECH_OFFICIAL, ...EXTRA_TECH_OFFICIAL };
const ALL_TECH_PRACTICE: Record<string, string[]> = { ...TECH_PRACTICE, ...EXTRA_TECH_PRACTICE };
const ALL_RECS: Record<string, { title: string; topics: string[]; url: string }[]> = { ...LEARNING_RECOMMENDATIONS, ...EXTRA_RECOMMENDATIONS };

export const assessmentFor = (skill: string) => ALL_ASSESSMENTS[bankOf(skill)];
export const techOfficialFor = (skill: string) => ALL_TECH_OFFICIAL[bankOf(skill)];
export const techPracticeFor = (skill: string) => ALL_TECH_PRACTICE[bankOf(skill)];
export const recommendationsFor = (skill: string) => ALL_RECS[bankOf(skill)];

// Specialization selection is hidden in the MVP demo; every new student starts with this generic skill.
export const DEFAULT_SKILL = "Software Engineering";
