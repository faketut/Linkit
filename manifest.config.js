import { defineManifest } from '@crxjs/vite-plugin';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('./package.json', import.meta.url)), 'utf8'),
);

export default defineManifest({
  manifest_version: 3,
  name: 'Linkit',
  description:
    'Auto-connect with People You May Know on LinkedIn and manage your profile skills.',
  version: pkg.version,
  action: {
    default_popup: 'src/popup/index.html',
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
  icons: {
    16: 'images/icon16.png',
    128: 'images/icon128.png',
  },
  permissions: ['scripting', 'storage'],
  host_permissions: [
    'https://www.linkedin.com/search/results/people/*',
    'https://www.linkedin.com/mynetwork/*',
    'https://www.linkedin.com/in/*/details/skills/*',
  ],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self'",
  },
  content_scripts: [
    {
      matches: [
        'https://*.linkedin.com/search/results/people/*',
        'https://*.linkedin.com/mynetwork/*',
        'https://*.linkedin.com/in/*/details/skills/*',
      ],
      js: ['src/content/index.js'],
    },
  ],
});
