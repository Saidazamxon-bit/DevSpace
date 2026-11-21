import { PRIORITIES, TASK_STATUSES } from '../lib/constants';

export const taskFields = (projectOptions, categories = []) => [
  { name: 'title', label: 'Title', required: true, span: 2, placeholder: 'What needs to be done?', maxLength: 200 },
  { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 3 },
  { name: 'project_id', label: 'Project', type: 'select', options: projectOptions, placeholder: 'No project' },
  { name: 'category', label: 'Category', placeholder: 'Backend, Bugfix…', hint: categories.length ? `Used: ${categories.slice(0, 5).join(', ')}` : undefined, maxLength: 60 },
  { name: 'status', label: 'Status', type: 'select', options: TASK_STATUSES, required: true, default: 'todo' },
  { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, required: true, default: 'medium' },
  { name: 'due_date', label: 'Due date', type: 'date' },
  { name: 'due_time', label: 'Due time', type: 'time', hint: 'Optional — shows on the timeline' },
];
