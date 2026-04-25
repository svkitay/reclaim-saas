import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  instagram: string;
  facebook: string;
  headline: string;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
          {label}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-700 font-medium transition-colors"
          title="Copy to clipboard"
        >
          {copied ? (
            <>
              <Check size={11} />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{value}</p>
    </div>
  );
}

export default function CopyBlock({ instagram, facebook, headline }: Props) {
  return (
    <div className="border-t border-slate-100 pt-3 space-y-1">
      <CopyField label="Ad Headline" value={headline} />
      <CopyField label="Instagram" value={instagram} />
      <CopyField label="Facebook" value={facebook} />
    </div>
  );
}
