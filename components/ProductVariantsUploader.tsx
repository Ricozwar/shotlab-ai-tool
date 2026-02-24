import React, { useCallback, useRef, useState } from 'react';
import { removeBackground } from '../services/geminiService';

interface ProductVariantsUploaderProps {
  images: string[];
  onImagesChange: (images: string[]) => void;
  variantLabels: string[];
  onVariantLabelsChange: (labels: string[]) => void;
  /** Key from parent to force remount on reset */
  resetKey?: number;
}

export const ProductVariantsUploader: React.FC<ProductVariantsUploaderProps> = ({
  images,
  onImagesChange,
  variantLabels,
  onVariantLabelsChange,
  resetKey = 0,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [processingIndex, setProcessingIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const processFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        alert('Proszę wgrać plik obrazka (JPG, PNG).');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onImagesChange([...images, dataUrl]);
        onVariantLabelsChange([...variantLabels, '']);
      };
      reader.readAsDataURL(file);
    },
    [images, variantLabels, onImagesChange, onVariantLabelsChange]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = '';
  };

  const handleRemove = useCallback(
    (index: number) => {
      const nextImages = images.filter((_, i) => i !== index);
      const nextLabels = variantLabels.filter((_, i) => i !== index);
      onImagesChange(nextImages);
      onVariantLabelsChange(nextLabels);
    },
    [images, variantLabels, onImagesChange, onVariantLabelsChange]
  );

  const handleRemoveBackground = useCallback(
    async (index: number) => {
      const img = images[index];
      if (!img) return;
      setProcessingIndex(index);
      try {
        const newImage = await removeBackground(img);
        const nextImages = [...images];
        nextImages[index] = newImage;
        onImagesChange(nextImages);
      } catch {
        alert('Wystąpił błąd podczas usuwania tła. Spróbuj ponownie.');
      } finally {
        setProcessingIndex(null);
      }
    },
    [images, onImagesChange]
  );

  const handleLabelChange = useCallback(
    (index: number, value: string) => {
      const next = [...variantLabels];
      next[index] = value;
      onVariantLabelsChange(next);
    },
    [variantLabels, onVariantLabelsChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile]
  );

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {images.length > 0 && (
        <div className="space-y-3">
          {images.map((img, index) => (
            <div
              key={`${resetKey}-${index}`}
              className="relative group rounded-xl overflow-hidden border border-slate-600 bg-slate-800 shadow-lg"
            >
              {processingIndex === index && (
                <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
                  <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-white font-medium text-sm animate-pulse">Gemini analizuje obraz...</p>
                  <p className="text-slate-400 text-xs mt-1">Wycinanie produktu z tła</p>
                </div>
              )}
              <div className="flex gap-3 p-3">
                <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-slate-900">
                  <img src={img} alt={`Wersja ${index + 1}`} className="w-full h-full object-contain" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
                  <span className="text-xs font-medium text-slate-400">Wersja kolorystyczna {index + 1}</span>
                  <input
                    type="text"
                    value={variantLabels[index] ?? ''}
                    onChange={(e) => handleLabelChange(index, e.target.value)}
                    placeholder="Np. Czerwony, Niebieski (opcjonalnie)"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveBackground(index)}
                      disabled={processingIndex !== null}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-2 py-1 rounded border border-indigo-500/30 hover:bg-indigo-500/10"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                      </svg>
                      Usuń tło
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(index)}
                      className="text-xs font-medium text-red-400 hover:text-red-300 flex items-center gap-1 px-2 py-1 rounded border border-red-500/30 hover:bg-red-500/10"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Usuń
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 min-h-[120px] cursor-pointer
          ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'}`}
      >
        <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-indigo-400">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-300 mt-2">
          {images.length === 0 ? 'Kliknij lub upuść zdjęcie produktu' : 'Dodaj kolejną wersję kolorystyczną'}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">PNG, JPG. Ta sama scena zostanie wygenerowana dla każdej wersji.</p>
      </div>
    </div>
  );
};
