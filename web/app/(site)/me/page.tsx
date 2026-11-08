import { MePanel } from '@/components/MePanel';

export const metadata = { title: 'My passes' };

export default function MePage() {
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">Passes</p>
      <h1 className="c-h1 mt-3" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
        Your passes and attempts.
      </h1>
      <p className="c-lead mt-3">Passes and attempts by gate, cooldowns running, and the balance you can withdraw.</p>
      <div className="mt-8">
        <MePanel />
      </div>
    </div>
  );
}
