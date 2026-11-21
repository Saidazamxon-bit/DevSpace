import { t } from '../i18n';
import { PRIORITIES, PROJECT_COLORS, PROJECT_STATUSES } from '../lib/constants';

export const projectFields = [
  { name: 'name', label: t('Project name'), required: true, span: 2, placeholder: t('e.g. Nebula Commerce'), maxLength: 120 },
  { name: 'description', label: t('Description'), type: 'textarea', span: 2, rows: 2 },
  { name: 'status', label: t('Status'), type: 'select', options: PROJECT_STATUSES, required: true, default: 'planning' },
  { name: 'priority', label: t('Priority'), type: 'select', options: PRIORITIES, required: true, default: 'medium' },
  { name: 'start_date', label: t('Start date'), type: 'date' },
  { name: 'deadline', label: t('Deadline'), type: 'date', validate: (v, all) => (all.start_date && v < all.start_date ? t('Deadline must be after the start date.') : null) },
  { name: 'url', label: t('Live URL'), type: 'url', placeholder: 'https://…' },
  { name: 'repo_url', label: t('GitHub repository'), type: 'url', placeholder: 'https://github.com/…' },
  { name: 'technologies', label: t('Technologies'), span: 2, placeholder: t('Laravel, React, MySQL'), hint: t('Comma-separated') },
  { name: 'color', label: t('Color'), type: 'color', colors: PROJECT_COLORS, span: 2 },
  { name: 'notes', label: t('Notes'), type: 'textarea', span: 2, rows: 4, placeholder: t('Client contacts, credentials location, decisions…') },
];
