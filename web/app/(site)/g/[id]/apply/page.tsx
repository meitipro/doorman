import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ApplyFlow } from '@/components/ApplyFlow';

export const metadata = { title: 'Take a gate' };

export default async function ApplyPage(props: PageProps<'/g/[id]/apply'>) {
  const { id } = await props.params;
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) notFound();
  return (
    <div className="c-wrap py-12">
      <p className="c-eyebrow">
        <Link href={`/g/${n}`} className="c-link">Gate #{n}</Link> · apply
      </p>
      <h1 className="c-h1 mt-3" style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>
        Answer three questions.
      </h1>
      <div className="mt-8">
        <ApplyFlow gateId={n} />
      </div>
    </div>
  );
}
