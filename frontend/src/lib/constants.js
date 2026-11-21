export const PROJECT_STATUSES = [
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
];
export const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];
export const TASK_STATUSES = [
  { value: 'todo', label: 'To do' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'review', label: 'Review' },
  { value: 'done', label: 'Done' },
];
export const SERVER_STATUSES = [
  { value: 'online', label: 'Online' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'offline', label: 'Offline' },
];
export const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'UZS', label: "UZS — Uzbek so'm" },
];
export const INTERVALS = [1, 5, 10, 15, 30, 60].map((m) => ({ value: String(m), label: m === 60 ? 'Every hour' : `Every ${m} min` }));

export const LANGUAGES = [
  ['plaintext', 'Plain text'], ['php', 'PHP'], ['javascript', 'JavaScript'], ['typescript', 'TypeScript'], ['jsx', 'JSX'],
  ['html', 'HTML'], ['css', 'CSS'], ['scss', 'SCSS'], ['sql', 'SQL'], ['bash', 'Bash'], ['python', 'Python'], ['json', 'JSON'],
  ['yaml', 'YAML'], ['go', 'Go'], ['rust', 'Rust'], ['java', 'Java'], ['csharp', 'C#'], ['cpp', 'C++'], ['c', 'C'],
  ['ruby', 'Ruby'], ['kotlin', 'Kotlin'], ['swift', 'Swift'], ['dart', 'Dart'], ['nginx', 'Nginx'], ['apache', 'Apache'],
  ['dockerfile', 'Dockerfile'], ['markdown', 'Markdown'], ['xml', 'XML'], ['ini', 'INI'],
].map(([value, label]) => ({ value, label }));

export const PROJECT_COLORS = ['#B8FF65', '#FF9F2E', '#6EA8FE', '#C084FC', '#F472B6', '#2DD4BF', '#FACC15', '#F87171'];
