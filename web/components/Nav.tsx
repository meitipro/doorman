import Link from 'next/link';

import { WalletButton } from './Wallet';

/** The site's mark: a doorway cut from a sky ground. The same drawing as docs/brand/doorman-icon.svg. */
export function Mark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 512 512" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="106" y="106" width="300" height="300" rx="46" fill="#38bdf8" />
      <path d="M196 346 V252 A60 60 0 0 1 316 252 V346 Z" fill="#06202e" />
      <circle cx="292" cy="304" r="9" fill="#38bdf8" />
    </svg>
  );
}

export function Nav() {
  return (
    <header className="c-nav">
      <div className="c-wrap c-nav-row">
        <Link href="/" className="c-brand" aria-label="Doorman home">
          <Mark />
          Doorman
        </Link>
        <nav className="c-links" aria-label="Main">
          <Link href="/#gates">Gates</Link>
          <Link href="/me">Passes</Link>
          <Link href="/#communities">For communities</Link>
          <Link href="/docs">Docs</Link>
        </nav>
        <div className="c-nav-right">
          <span className="c-pill hidden sm:inline-flex" title="GenLayer Studio Next, chain 61997">
            <span className="dot" />
            Studio Next
          </span>
          <WalletButton />
          <Link href="/new" className="c-btn small solid hidden sm:inline-flex">
            Open a gate
          </Link>
        </div>
      </div>
    </header>
  );
}
