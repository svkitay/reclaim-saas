const BASE = import.meta.env.VITE_API_URL || '/api';

export async function generateMarketingAsset(file: File): Promise<{
  originalName: string;
  lifestyleImageUrl: string;
  instagram: string;
  facebook: string;
  headline: string;
}> {
  const form = new FormData();
  form.append('image', file);

  const res = await fetch(`${BASE}/generate`, {
    method: 'POST',
    body: form,
  });

  if (!res.ok) {
    let msg = `Server error: ${res.status}`;
    try {
      const err = await res.json() as { error?: string };
      msg = err.error || msg;
    } catch { /* ignore */ }
    throw new Error(msg);
  }

  return res.json();
}
