import React, { useCallback, useState } from 'react';
// Usunięto lokalny import geminiService
import { isApiConfigured, getStoredToken, apiRemoveBackground } from '../services/apiClient';

interface ImageUploaderProps {
  onImageSelected: (base64: string) => void;
  selectedImage: string | null;
  onClear: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected, selectedImage, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Critical: reset value so same file can be selected again
    event.target.value = '';
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Proszę wgrać plik obrazka (JPG, PNG).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      onImageSelected(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [onImageSelected]);

  const handleRemoveBackground = async () => {
    if (!selectedImage) return;
    const useApi = isApiConfigured() && Boolean(getStoredToken());
    setIsProcessing(true);
    try {
      const newImage = await apiRemoveBackground(selectedImage);
      onImageSelected(newImage);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wystąpił błąd podczas usuwania tła. Spróbuj ponownie.";
      alert(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedImage) {
    return (
      <div className="relative group rounded-xl overflow-hidden border border-slate-600 bg-slate-800 shadow-xl">
        {isProcessing && (
          <div className="absolute inset-0 z-20 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center">
             <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
             <p className="text-white font-medium text-sm animate-pulse">Gemini analizuje obraz...</p>
             <p className="text-slate-400 text-xs mt-1">Wycinanie produktu z tła</p>
          </div>
        )}

        <img 
          src={selectedImage} 
          alt="Product Preview" 
          className="w-full h-64 object-contain p-4 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-10 transition-opacity duration-300" 
        />
        
        {!isProcessing && (
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
             <button 
              onClick={handleRemoveBackground}
              className="px-5 py-2 rounded-full font-medium transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Usuń tło (Gemini)
            </button>

            <button 
              onClick={onClear}
              className="bg-red-500/80 hover:bg-red-500 text-white px-5 py-2 rounded-full font-medium transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 shadow-lg text-sm backdrop-blur-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Usuń zdjęcie
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 h-64
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-500/10' 
          : 'border-slate-600 hover:border-slate-500 bg-slate-800/50'
        }`}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <label 
        htmlFor="file-upload"
        className="cursor-pointer flex flex-col items-center gap-4"
      >
        <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center text-indigo-400">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <p className="text-lg font-medium text-slate-200">Kliknij lub upuść zdjęcie</p>
          <p className="text-sm text-slate-400 mt-1">Wspierane formaty: PNG, JPG</p>
        </div>
      </label>
    </div>
  );
};