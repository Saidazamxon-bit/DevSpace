import { INTERVALS } from '../lib/constants';

export const monitorFields = (projects, servers) => [
  { name: 'name', label: 'Name', required: true, placeholder: 'Production website' },
  { name: 'url', label: 'URL', type: 'url', required: true, placeholder: 'https://example.com/health' },
  { name: 'check_interval', label: 'Check interval', type: 'select', options: INTERVALS, required: true, default: '5' },
  { name: 'method', label: 'HTTP method', type: 'select', options: [{ value: 'GET', label: 'GET' }, { value: 'HEAD', label: 'HEAD (faster)' }], required: true, default: 'GET' },
  { name: 'expected_status', label: 'Expected status', type: 'number', min: 100, placeholder: 'Any 2xx/3xx', hint: 'Leave empty to accept any 2xx or 3xx' },
  { name: 'timeout_seconds', label: 'Timeout (seconds)', type: 'number', min: 2, default: 10, required: true },
  { name: 'project_id', label: 'Project', type: 'select', options: projects, placeholder: 'None' },
  { name: 'server_id', label: 'Server', type: 'select', options: servers, placeholder: 'None' },
  { name: 'is_active', label: 'Active', type: 'switch', switchLabel: 'Monitoring enabled', default: true, span: 2 },
];
