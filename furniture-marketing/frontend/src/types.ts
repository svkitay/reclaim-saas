export type ProcessingStatus = 'pending' | 'uploading' | 'generating' | 'done' | 'error';

export interface ProductResult {
  id: string;
  originalName: string;
  previewUrl: string;
  status: ProcessingStatus;
  lifestyleImageUrl?: string;
  instagram?: string;
  facebook?: string;
  headline?: string;
  error?: string;
}
