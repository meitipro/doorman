import { NewGate } from '@/components/NewGate';

export const metadata = { title: 'Open a gate' };

export default function NewPage() {
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">For communities</p>
      <h1 className="c-h1 mt-3" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
        Open a gate.
      </h1>
      <p className="c-lead mt-3">
        Write the handbook and a bank of 6 to 20 questions with a rubric each. Applicants are dealt three from their own address.
      </p>
      <div className="mt-8">
        <NewGate />
      </div>
    </div>
  );
}
