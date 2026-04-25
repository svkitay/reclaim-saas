import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';
import { ProcessingStatus, ProductResult } from '../types';
import CopyBlock from './CopyBlock';

interface Props {
  result: ProductResult;
}

function statusLabel(status: ProcessingStatus): string {
  const map: Record<ProcessingStatus, string> = {
    pending: 'Waiting…',
    uploading: 'Uploading image…',
    generating: 'Generating lifestyle scene…',
    done: 'Done',
    error: 'Error',
  };
  return map[status];
}

function Spinner() {
  return (
    <svg className="animate-spin h-8 w-8 text-sky-400" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

export default function ResultCard({ result }: Props) {
  const { status, lifestyleImageUrl, originalName, error } = result;

  return (
    <div className="card flex flex-col">
      {/* Image area */}
      <div className="relative aspect-video bg-slate-100 flex-shrink-0">
        {status === 'done' && lifestyleImageUrl ? (
          <img
            src={lifestyleImageUrl}
            alt={`Lifestyle scene for ${originalName}`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : status === 'error' ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-red-400 px-4">
            <AlertCircle size={28} />
            <p className="text-xs text-center leading-relaxed">{error || 'Generation failed'}</p>
          </div>
        ) : (
          <div className="w-full h-full animate-pulse bg-slate-200 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <span className="text-xs text-slate-500 font-medium">{statusLabel(status)}</span>
          </div>
        )}

        {/* Status badge */}
        {status !== 'done' && status !== 'error' && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-200">
            <div
              className={clsx(
                'h-full bg-sky-400 transition-all duration-700',
                status === 'pending' ? 'w-0' :
                status === 'uploading' ? 'w-1/4' :
                'w-3/4 animate-pulse'
              )}
            />
          </div>
        )}
      </div>

      {/* Content area */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700 truncate" title={originalName}>
            {originalName}
          </p>
          <span
            className={clsx(
              'flex-shrink-0 text-xs font-medium px-2 py-0.5 rounded-full',
              status === 'done' ? 'bg-emerald-100 text-emerald-700' :
              status === 'error' ? 'bg-red-100 text-red-600' :
              'bg-sky-100 text-sky-600'
            )}
          >
            {status === 'done' ? 'Ready' : status === 'error' ? 'Failed' : 'Processing'}
          </span>
        </div>

        {status === 'done' && result.instagram && result.facebook && result.headline && (
          <CopyBlock
            instagram={result.instagram}
            facebook={result.facebook}
            headline={result.headline}
          />
        )}
      </div>
    </div>
  );
}
