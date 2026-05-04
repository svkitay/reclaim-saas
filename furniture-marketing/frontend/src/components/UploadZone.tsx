import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import clsx from 'clsx';

interface Props {
  onFiles: (files: File[]) => void;
  disabled: boolean;
}

export default function UploadZone({ onFiles, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current++;
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onFiles(files);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onFiles(files);
    e.target.value = '';
  }

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={!disabled ? handleDrop : undefined}
      className={clsx(
        'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed',
        'cursor-pointer select-none transition-all duration-150 py-14 px-6',
        isDragging && !disabled
          ? 'border-sky-400 bg-sky-50'
          : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40',
        disabled && 'opacity-60 cursor-not-allowed pointer-events-none'
      )}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
      <div
        className={clsx(
          'flex h-14 w-14 items-center justify-center rounded-2xl transition-colors',
          isDragging && !disabled ? 'bg-sky-100 text-sky-500' : 'bg-slate-100 text-slate-400'
        )}
      >
        <UploadCloud size={28} />
      </div>
      <div className="text-center">
        <p className="text-base font-semibold text-slate-700">
          {disabled ? 'Processing images…' : 'Drop product photos here'}
        </p>
        <p className="mt-1 text-sm text-slate-400">
          {disabled
            ? 'New uploads will start when current batch finishes'
            : 'or click to browse — JPG, PNG, WEBP up to 20 MB each'}
        </p>
      </div>
    </div>
  );
}
