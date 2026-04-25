import { Download } from 'lucide-react';
import { ProductResult } from '../types';

interface Props {
  results: ProductResult[];
}

function escape(val: string): string {
  return `"${(val ?? '').replace(/"/g, '""')}"`;
}

function exportCSV(results: ProductResult[]) {
  const done = results.filter(r => r.status === 'done');
  if (done.length === 0) return;

  const headers = ['File Name', 'Ad Headline', 'Instagram Caption', 'Facebook Post', 'Lifestyle Image URL'];

  const rows = done.map(r =>
    [
      escape(r.originalName),
      escape(r.headline ?? ''),
      escape(r.instagram ?? ''),
      escape(r.facebook ?? ''),
      escape(r.lifestyleImageUrl ?? ''),
    ].join(',')
  );

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `furniture-marketing-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function ExportButton({ results }: Props) {
  const doneCount = results.filter(r => r.status === 'done').length;

  return (
    <button
      onClick={() => exportCSV(results)}
      disabled={doneCount === 0}
      className="btn-primary"
    >
      <Download size={16} />
      Export CSV{doneCount > 0 ? ` (${doneCount})` : ''}
    </button>
  );
}
