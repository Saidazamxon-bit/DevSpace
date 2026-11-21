import { t } from '../i18n';
import { PRIORITIES, TASK_STATUSES } from '../lib/constants';

export const taskFields = (projectOptions, categories = []) => [
  { name: 'title', label: t('Title'), required: true, span: 2, placeholder: t('What needs to be done?'), maxLength: 200 },
  { name: 'description', label: t('Description'), type: 'textarea', span: 2, rows: 3 },
  { name: 'project_id', label: t('Project'), type: 'select', options: projectOptions, placeholder: t('No project') },
  { name: 'category', label: t('Category'), placeholder: t('Backend, Bugfix…'), hint: categories.length ? t('Used: {list}', { list: categories.slice(0, 5).join(', ') }) : undefined, maxLength: 60 },
  { name: 'status', label: t('Status'), type: 'select', options: TASK_STATUSES, required: true, default: 'todo' },
  { name: 'priority', label: t('Priority'), type: 'select', options: PRIORITIES, required: true, default: 'medium' },
  { name: 'due_date', label: t('Due date'), type: 'date' },
  { name: 'due_time', label: t('Due time'), type: 'time', hint: t('Optional — shows on the timeline') },
];
