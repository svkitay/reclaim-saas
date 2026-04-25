import { useState } from 'react';
import { generateMarketingAsset } from './api';
import { ProductResult } from './types';
import UploadZone from './components/UploadZone';
import ResultsGrid from './components/ResultsGrid';
import ExportButton from './components/ExportButton';

export default function App() {
  const [results, setResults] = useState<ProductResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  function updateResult(id: string, patch: Partial<ProductResult>) {
    setResults(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  async function handleFiles(files: File[]) {
    if (isProcessing) return;

    const initial: ProductResult[] = files.map(file => ({
      id: crypto.randomUUID(),
      originalName: file.name,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
    }));

    setResults(prev => [...prev, ...initial]);
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const entry = initial[i];

      updateResult(entry.id, { status: 'uploading' });

      try {
        updateResult(entry.id, { status: 'generating' });
        const data = await generateMarketingAsset(files[i]);
        updateResult(entry.id, {
          status: 'done',
          lifestyleImageUrl: data.lifestyleImageUrl,
          instagram: data.instagram,
          facebook: data.facebook,
          headline: data.headline,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        updateResult(entry.id, { status: 'error', error: message });
      }
    }

    setIsProcessing(false);
  }

  function handleClear() {
    results.forEach(r => URL.revokeObjectURL(r.previewUrl));
    setResults([]);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="text-white px-6 py-4 shadow-lg" style={{ background: '#0B1120' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-wide">
              Furniture<span style={{ color: '#0EA5E9' }}>.</span>Studio
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">AI-powered lifestyle imagery & marketing copy</p>
          </div>
          <div className="flex items-center gap-4">
            {results.length > 0 && !isProcessing && (
              <button
                onClick={handleClear}
                className="text-sm text-slate-400 hover:text-white transition-colors"
              >
                Clear all
              </button>
            )}
            <ExportButton results={results} />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <UploadZone onFiles={handleFiles} disabled={isProcessing} />
        {results.length > 0 && <ResultsGrid results={results} />}
      </main>
    </div>
  );
}
