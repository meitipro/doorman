import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { gitConfig } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <span className="inline-flex items-center gap-2 font-semibold">
          <svg width={22} height={22} viewBox="106 106 300 300" aria-hidden>
            <rect x="106" y="106" width="300" height="300" rx="46" fill="#38bdf8" />
            <path d="M196 346 V252 A60 60 0 0 1 316 252 V346 Z" fill="#06202e" />
            <circle cx="292" cy="304" r="9" fill="#38bdf8" />
          </svg>
          Doorman
          <span className="c-pill ml-1" style={{ height: 22, fontSize: 10.5 }}>
            <span className="dot" />
            Studio Next
          </span>
        </span>
      ),
      url: '/',
    },
    links: [
      { text: 'Gates', url: '/#gates' },
      { text: 'Passes', url: '/me' },
      { text: 'For communities', url: '/#communities' },
    ],
    githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`,
  };
}
