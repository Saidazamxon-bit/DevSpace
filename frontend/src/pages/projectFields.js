import { PRIORITIES, PROJECT_COLORS, PROJECT_STATUSES } from '../lib/constants';

export const projectFields = [
  { name: 'name', label: 'Project name', required: true, span: 2, placeholder: 'e.g. Nebula Commerce', maxLength: 120 },
  { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 2 },
  { name: 'status', label: 'Status', type: 'select', options: PROJECT_STATUSES, required: true, default: 'planning' },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, required: true, default: 'medium' },
  { name: 'start_date', label: 'Start date', type: 'date' },
  { name: 'deadline', label: 'Deadline', type: 'date', validate: (v, all) => (all.start_date && v < all.start_date ? 'Deadline must be after the start date.' : null) },
  { name: 'url', label: 'Live URL', type: 'url', placeholder: 'https://…' },
  { name: 'repo_url', label: 'GitHub repository', type: 'url', placeholder: 'https://github.com/…' },
  { name: 'technologies', label: 'Technologies', span: 2, placeholder: 'Laravel, React, MySQL', hint: 'Comma-separated' },
  { name: 'color', label: 'Color', type: 'color', colors: PROJECT_COLORS, span: 2 },
  { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 4, placeholder: 'Client contacts, credentials location, decisions…' },
];
