import { t } from '../i18n';
import { INTERVALS } from '../lib/constants';

export const monitorFields = (projects, servers) => [
  { name: 'name', label: t('Name'), required: true, placeholder: t('Production website') },
  { name: 'url', label: t('URL'), type: 'url', required: true, placeholder: t('https://example.com/health') },
  { name: 'check_interval', label: t('Check interval'), type: 'select', options: INTERVALS, required: true, default: '5' },
  { name: 'method', label: t('HTTP method'), type: 'select', options: [{ value: 'GET', label: t('GET') }, { value: 'HEAD', label: t('HEAD (faster)') }], required: true, default: 'GET' },
  { name: 'expected_status', label: t('Expected status'), type: 'number', min: 100, placeholder: t('Any 2xx/3xx'), hint: t('Leave empty to accept any 2xx or 3xx') },
  { name: 'timeout_seconds', label: t('Timeout (seconds)'), type: 'number', min: 2, default: 10, required: true },
  { name: 'project_id', label: t('Project'), type: 'select', options: projects, placeholder: t('None') },
  { name: 'server_id', label: t('Server'), type: 'select', options: servers, placeholder: t('None') },
  { name: 'is_active', label: t('Active'), type: 'switch', switchLabel: t('Monitoring enabled'), default: true, span: 2 },
];
