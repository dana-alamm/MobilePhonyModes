// Additional hardcoded question sets for skill families beyond the four original banks.
import type { McqQuestion } from "./content.js";

type Rec = { title: string; topics: string[]; url: string };
const q = (text: string, options: string[], answer: number): McqQuestion => ({ q: text, options, answer });

export const EXTRA_ASSESSMENTS: Record<string, McqQuestion[]> = {
  "Mobile Development": [
    q("What should an app do when it moves to the background?", ["Nothing; the OS keeps everything forever", "Save important state and release heavy resources", "Delete all user data", "Restart itself"], 1),
    q("Why should network calls not run on the main UI thread?", ["They would freeze the interface", "Networking is only allowed on the main thread", "They use no memory", "They cannot return data"], 0),
    q("What is the purpose of runtime permissions such as camera or location?", ["To speed up the app", "To let users grant or deny access to sensitive features", "To encrypt the database", "To enable dark mode"], 1),
    q("Which storage suits small key-value settings such as a theme choice?", ["A video file", "Shared preferences / user defaults", "The GPU", "A push notification"], 1),
    q("What does sending a push notification require?", ["A device token registered with the platform push service", "The user's password", "A second phone", "Nothing"], 0),
    q("How do you keep a list with thousands of items smooth?", ["Render all items at once", "Lazily build or recycle only the visible items", "Disable scrolling", "Use larger images"], 1),
    q("What does 'offline-first' mean?", ["The app only works offline", "The app works from local data and syncs when online", "The app has no UI", "The app never updates"], 1),
    q("Which statement about release builds is true?", ["Release builds are optimized and signed for distribution", "Debug builds are signed for the stores", "They are identical", "Release builds include developer tools"], 0),
    q("Which navigation pattern keeps a back history of screens?", ["Hash navigation", "Random navigation", "Stack navigation", "No navigation"], 2),
    q("Where should API tokens be stored on a device?", ["In a plain text log", "In a public file", "In secure storage such as Keychain or Keystore", "In the app icon"], 2),
  ],
  "Data & AI": [
    q("What is overfitting in machine learning?", ["The model performs well on training data but poorly on new data", "The model trains too fast", "The model has too few rows to run", "The model has no features"], 0),
    q("Which metric suits an imbalanced classification task better than plain accuracy?", ["Number of columns", "File size", "Precision and recall (F1 score)", "Mean of the ID column"], 2),
    q("What does a SQL JOIN do?", ["Deletes a table", "Combines rows from two tables using a related column", "Encrypts columns", "Renames a database"], 1),
    q("In pandas, which structure is a two-dimensional labeled table?", ["Series", "DataFrame", "Tuple", "Set"], 1),
    q("What is the purpose of a train/test split?", ["Make the dataset larger", "Remove all missing values", "Speed up SQL queries", "Estimate performance on unseen data"], 3),
    q("What is a document database such as MongoDB best suited for?", ["Flexible JSON-like documents with changing structure", "Only rigid fixed tables", "Image editing", "Compiling code"], 0),
    q("What does an activation function add to a neural network?", ["More rows", "A database index", "Non-linearity", "Data encryption"], 2),
    q("What is an ETL pipeline?", ["Extract, transform and load data into a target system", "A type of chart", "A neural network layer", "A SQL sorting keyword"], 0),
    q("Which chart best shows the distribution of one numeric variable?", ["Gantt chart", "Histogram", "Org chart", "Flowchart"], 1),
    q("What is data leakage?", ["A slow SQL query", "Losing a laptop", "A missing column name", "Test information leaking into training so results look better than reality"], 3),
  ],
  "Cloud & DevOps": [
    q("What is the main benefit of containers such as Docker?", ["They replace the operating system entirely", "They only store databases", "They package an app with its dependencies so it runs consistently", "They compile code faster"], 2),
    q("What does CI/CD automate?", ["Building, testing and deploying code changes", "Writing requirements", "Hiring", "Database design only"], 0),
    q("What does Kubernetes primarily do?", ["Edits images", "Orchestrates, scales and heals containerized workloads", "Writes unit tests", "Manages DNS only"], 1),
    q("What is Infrastructure as Code?", ["Writing server code by hand", "A type of firewall", "A database engine", "Managing infrastructure through versioned definition files"], 3),
    q("Which Linux command lists running processes?", ["ls", "ps", "cd", "mv"], 1),
    q("What is the principle of least privilege?", ["Give everyone admin access", "Share one password", "Grant only the permissions needed for a task", "Disable all logging"], 2),
    q("What does horizontal scaling mean?", ["Adding more instances to share load", "Adding RAM to one server", "Deleting servers", "Slowing traffic"], 0),
    q("What is a load balancer used for?", ["Compressing images", "Storing backups only", "Compiling source code", "Distributing incoming traffic across multiple servers"], 3),
    q("Why do teams use monitoring and alerting?", ["To delete old logs", "To detect problems early and respond quickly", "To replace automated tests", "To hide errors from users"], 1),
    q("Why keep secrets such as API keys in a secrets manager instead of code?", ["It makes builds slower", "Secrets are illegal in code", "It avoids leaking them through source control", "Linux requires it"], 2),
  ],
  "Cybersecurity & Networking": [
    q("What does the CIA triad stand for?", ["Control, Identity, Access", "Cache, Index, Archive", "Confidentiality, Integrity, Availability", "Certify, Inspect, Audit"], 2),
    q("What is phishing?", ["Tricking people into revealing information with fake messages", "A network cable type", "A firewall rule", "A hashing algorithm"], 0),
    q("What does a firewall do?", ["Encrypts every disk", "Filters network traffic according to rules", "Backs up databases", "Creates user accounts"], 1),
    q("What is the difference between encryption and hashing?", ["They are identical", "Hashing is reversible with a key", "Encryption is one-way", "Encryption is reversible with a key; hashing is one-way"], 3),
    q("What is SQL injection?", ["A database backup method", "A faster index type", "Malicious SQL inserted through unvalidated input", "A join type"], 2),
    q("What does multi-factor authentication add?", ["A faster login", "Two or more independent proofs of identity", "A longer username", "A VPN tunnel"], 1),
    q("What is the purpose of a penetration test?", ["An authorized simulated attack to find weaknesses", "Deleting malware", "Speeding up the network", "Training employees only"], 0),
    q("Which protocol secures web traffic with encryption?", ["HTTP", "HTTPS (TLS)", "FTP", "Telnet"], 1),
    q("What is cross-site scripting (XSS)?", ["A CSS framework", "A routing protocol", "A disk format", "Injecting malicious scripts into pages other users view"], 3),
    q("What is a subnet mask used for?", ["Encrypting packets", "Blocking spam emails", "Dividing an IP address into network and host parts", "Naming files"], 2),
  ],
  "QA & Testing": [
    q("What is the goal of software testing?", ["To prove the software has no bugs at all", "To find defects and build confidence in quality", "To increase code size", "To replace requirements"], 1),
    q("What is regression testing?", ["Testing only brand-new features", "Testing hardware", "Re-testing to confirm changes did not break existing behavior", "Testing without requirements"], 2),
    q("Which describes a unit test?", ["It tests a small piece of code in isolation", "It tests the whole system end to end", "It tests user feelings", "It tests network cables"], 0),
    q("What is a test case?", ["A deployment script", "A design mockup", "A bug report only", "Steps, inputs and an expected result used to verify behavior"], 3),
    q("What should a good bug report include?", ["Only the words 'it is broken'", "Steps to reproduce, expected vs actual result and environment", "The tester's personal opinion", "A screenshot of the desktop only"], 1),
    q("What is boundary value analysis?", ["Testing random values only", "Testing UI colors", "Testing values at the edges of input ranges", "Testing server hardware"], 2),
    q("What does test automation help with most?", ["Repeating stable tests quickly and consistently", "Replacing all manual testing", "Writing requirements", "Designing the UI"], 0),
    q("What is the difference between verification and validation?", ["They are the same", "Validation is only unit testing", "Verification is only user acceptance", "Verification checks we built it right; validation checks we built the right thing"], 3),
    q("In the test pyramid, which type should you have the most of?", ["End-to-end UI tests", "Unit tests", "Manual exploratory tests", "Load tests"], 1),
    q("What is smoke testing?", ["Exhaustive testing of every path", "A security audit", "A quick check that the most critical functions work", "Performance tuning"], 2),
  ],
  "Systems & Product": [
    q("What is the purpose of requirements gathering?", ["Writing the final code", "Deploying to production", "Understanding what stakeholders need before building", "Hiring developers"], 2),
    q("In Scrum, what is a sprint?", ["A daily meeting", "A fixed-length time-box that delivers a usable increment", "A type of defect", "The final release"], 1),
    q("What is a user story?", ["A database schema", "A bug report", "A source file", "A short description of a needed feature from the user's perspective"], 3),
    q("What is a product backlog?", ["An ordered list of work for the product", "A list of fixed bugs only", "The org chart", "A server log"], 0),
    q("What does a UML use case diagram show?", ["Database indexes", "CPU usage", "Actors and how they interact with a system", "Color palettes"], 2),
    q("What is the benefit of a layered or modular architecture?", ["Slower systems", "Separation of concerns and easier maintenance", "No testing needed", "One giant file"], 1),
    q("Which technique helps prioritize features?", ["MoSCoW or a value-versus-effort matrix", "Random choice", "Alphabetical order", "Longest first"], 0),
    q("What is a stakeholder?", ["Only the developer", "Only the customer", "Only the manager", "Anyone affected by or interested in the project"], 3),
    q("What is technical debt?", ["A bank loan", "The future cost of quick or poor design choices", "Unused licenses", "A server bill"], 1),
    q("What does the Product Owner do in Scrum?", ["Writes all the code", "Runs the servers", "Maximizes product value and manages the backlog", "Approves every commit"], 2),
  ],
};

export const EXTRA_TECH_OFFICIAL: Record<string, string[]> = {
  "Mobile Development": [
    "Explain the mobile app lifecycle and what you save or release when the app goes to the background.",
    "How do you handle state management and navigation in a mobile app you have built?",
    "How would you design an app that works offline and syncs data when the connection returns?",
    "How do you handle API calls, errors, loading states and authentication tokens on mobile?",
    "How would you test, release and monitor a mobile app on the app stores?",
  ],
  "Data & AI": [
    "Explain the machine learning workflow from raw data to a deployed model.",
    "How do you detect and handle overfitting, and which metrics do you choose for a classification problem?",
    "How do you clean and explore a messy dataset using SQL or pandas?",
    "Explain the difference between SQL and NoSQL databases and when you would pick each.",
    "How would you build a reliable data pipeline and communicate insights with dashboards or reports?",
  ],
  "Cloud & DevOps": [
    "Explain a CI/CD pipeline you would design from commit to production.",
    "What is the difference between a container and a virtual machine, and how does Kubernetes fit in?",
    "How would you make an application on the cloud highly available and scalable?",
    "How do you manage secrets, permissions and access in the cloud, for example on AWS, Azure or GCP?",
    "How would you monitor a production system and respond to an incident?",
  ],
  "Cybersecurity & Networking": [
    "Explain how you would secure a web application against common risks such as injection and XSS.",
    "What is the difference between symmetric and asymmetric encryption, and where is each used?",
    "How would you run a vulnerability assessment or penetration test ethically?",
    "How do you design network security with firewalls, segmentation and monitoring?",
    "Walk through how you would respond to a suspected security incident.",
  ],
  "QA & Testing": [
    "Explain your approach to creating a test plan and test cases for a new feature.",
    "What is the difference between manual and automated testing, and how do you decide what to automate?",
    "How do you write a good bug report, and how do you handle a disagreement with a developer about a defect?",
    "Explain the test pyramid and the role of unit, integration and end-to-end tests.",
    "How would you test an API, and which tools or frameworks would you use?",
  ],
  "Systems & Product": [
    "How do you gather and document requirements, and how do you handle changing requirements?",
    "Explain how you would prioritize a product backlog with competing stakeholder demands.",
    "Describe the Scrum events and your role in making them effective.",
    "How would you design a high-level architecture for a new web application, and which trade-offs would you consider?",
    "How do you explain trade-offs and technical debt to non-technical stakeholders?",
  ],
};

export const EXTRA_TECH_PRACTICE: Record<string, string[]> = {
  "Mobile Development": ["What is the difference between native and cross-platform mobile development?", "What are runtime permissions and why do they matter?"],
  "Data & AI": ["What is the difference between supervised and unsupervised learning?", "What is a DataFrame and what can you do with it?"],
  "Cloud & DevOps": ["What is Docker and why is it useful?", "What is the difference between continuous integration and continuous delivery?"],
  "Cybersecurity & Networking": ["What is the CIA triad?", "What is the difference between a vulnerability and a threat?"],
  "QA & Testing": ["What is the difference between functional and non-functional testing?", "What is regression testing and when do you run it?"],
  "Systems & Product": ["What is the difference between Agile and Waterfall?", "What is a user story and what makes it a good one?"],
};

export const EXTRA_RECOMMENDATIONS: Record<string, Rec[]> = {
  "Mobile Development": [
    { title: "Mobile app development fundamentals", topics: ["App lifecycle", "Navigation", "Permissions"], url: "https://www.udemy.com/topic/mobile-app-development/" },
    { title: "Android development", topics: ["Activities and lifecycle", "Lists and storage"], url: "https://www.udemy.com/topic/android-development/" },
    { title: "iOS development", topics: ["Swift basics", "Navigation", "Secure storage"], url: "https://www.udemy.com/topic/ios-development/" },
  ],
  "Data & AI": [
    { title: "Data science foundations", topics: ["Pandas and NumPy", "Data cleaning", "Visualization"], url: "https://www.udemy.com/topic/data-science/" },
    { title: "Machine learning essentials", topics: ["Train/test split", "Overfitting", "Metrics"], url: "https://www.udemy.com/topic/machine-learning/" },
    { title: "SQL for data work", topics: ["Joins", "Aggregations"], url: "https://www.udemy.com/topic/sql/" },
  ],
  "Cloud & DevOps": [
    { title: "DevOps fundamentals", topics: ["CI/CD", "Infrastructure as Code", "Monitoring"], url: "https://www.udemy.com/topic/devops/" },
    { title: "Docker and containers", topics: ["Images", "Containers", "Compose"], url: "https://www.udemy.com/topic/docker/" },
    { title: "Kubernetes basics", topics: ["Pods", "Deployments", "Scaling"], url: "https://www.udemy.com/topic/kubernetes/" },
  ],
  "Cybersecurity & Networking": [
    { title: "Cybersecurity fundamentals", topics: ["CIA triad", "Threats and risks"], url: "https://www.udemy.com/topic/cyber-security/" },
    { title: "Ethical hacking basics", topics: ["Reconnaissance", "Injection", "XSS"], url: "https://www.udemy.com/topic/ethical-hacking/" },
    { title: "Network security", topics: ["Firewalls", "Subnets", "TLS"], url: "https://www.udemy.com/topic/network-security/" },
  ],
  "QA & Testing": [
    { title: "Software testing fundamentals", topics: ["Test cases", "Bug reports", "Regression"], url: "https://www.udemy.com/topic/software-testing/" },
    { title: "Selenium test automation", topics: ["Locators", "Automated UI tests"], url: "https://www.udemy.com/topic/selenium/" },
    { title: "API testing", topics: ["Requests and assertions", "Status codes"], url: "https://www.udemy.com/topic/api-testing/" },
  ],
  "Systems & Product": [
    { title: "Agile and Scrum", topics: ["Sprints", "Backlog", "Roles"], url: "https://www.udemy.com/topic/scrum/" },
    { title: "Business analysis", topics: ["Requirements", "Use cases", "Stakeholders"], url: "https://www.udemy.com/topic/business-analysis/" },
    { title: "Software architecture", topics: ["Layers", "Trade-offs", "Technical debt"], url: "https://www.udemy.com/topic/software-architecture/" },
  ],
};
