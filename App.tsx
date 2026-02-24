import React, { useState, useRef } from 'react';
import { generateImage } from './services/geminiService';
import { generateReel } from './services/veoService';
import { getReelUsageToday, incrementReelUsage, canGenerateReel } from './utils/reelLimit';
import { AppMode, AppTab, GeneratedImage, EnhancementOptions, ImageResolution } from './types';
import { STYLES } from './data/styles';
import { ASPECT_RATIOS } from './data/aspectRatios';
import { REEL_PRESETS } from './data/reelPresets';
import { Button } from './components/Button';
import { ProductVariantsUploader } from './components/ProductVariantsUploader';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('arrangement');
  const [prompt, setPrompt] = useState<string>('');
  const [productName, setProductName] = useState<string>('');
  const [selectedStyleId, setSelectedStyleId] = useState<string>('');
  // Changed from single string to array of strings for multi-select
  const [selectedRatios, setSelectedRatios] = useState<string[]>(['1:1']);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productVariantLabels, setProductVariantLabels] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [currentImage, setCurrentImage] = useState<GeneratedImage | null>(null);
  // Key to force re-render of ImageUploader on reset
  const [resetKey, setResetKey] = useState<number>(0);
  
  // New State for Enhancements
  const [enhancements, setEnhancements] = useState<EnhancementOptions>({
    lighting: 'natural',
    shadows: 'soft',
    autoColorMatch: true
  });
  const [resolution, setResolution] = useState<ImageResolution>('2K');

  const [reelPrompt, setReelPrompt] = useState<string>('');
  const [reelVideoUrl, setReelVideoUrl] = useState<string | null>(null);
  const [isGeneratingReel, setIsGeneratingReel] = useState<boolean>(false);
  const [useFirstFrameForReel, setUseFirstFrameForReel] = useState<boolean>(false);
  /** Zdjęcie wybrane jako pierwsza klatka rolki (np. po kliknięciu "Generuj rolkę" na obrazku). */
  const [reelSourceImage, setReelSourceImage] = useState<GeneratedImage | null>(null);
  /** Id stylu wyświetlanego w pop-upie w pełnym rozmiarze (null = zamknięty). */
  const [stylePreviewId, setStylePreviewId] = useState<string | null>(null);
  const [salonCategoryOpen, setSalonCategoryOpen] = useState(true);
  const [kidsCategoryOpen, setKidsCategoryOpen] = useState(true);
  const [doNotModifyProduct, setDoNotModifyProduct] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const productNameInputRef = useRef<HTMLInputElement>(null);

  const selectStyleById = (styleId: string) => {
    setSelectedStyleId(styleId);
    const style = STYLES.find(s => s.id === styleId);
    if (style) setPrompt(style.prompt);
  };

  const toggleRatio = (ratioId: string) => {
    setSelectedRatios(prev => {
      if (prev.includes(ratioId)) {
        // Don't allow deselecting the last item
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== ratioId);
      } else {
        return [...prev, ratioId];
      }
    });
  };

  const handleGenerate = async () => {
    if (!productName.trim()) {
      alert("Proszę wpisać nazwę produktu / projektu. Pole jest wymagane.");
      setTimeout(() => productNameInputRef.current?.focus(), 0);
      return;
    }
    if (!prompt.trim()) {
      alert("Proszę wpisać opis scenerii lub wybrać styl.");
      return;
    }

    if (productImages.length === 0) {
      alert("Proszę wgrać co najmniej jedno zdjęcie produktu dla trybu aranżacji.");
      return;
    }

    setIsGenerating(true);
    setCurrentImage(null);

    try {
      const styleName = STYLES.find(s => s.id === selectedStyleId)?.name || 'Custom';

      // Dla każdej pary (format, wariant produktu) jedno wywołanie – ta sama scena, inny produkt
      const effectivePrompt = doNotModifyProduct
        ? prompt.trim() + '\n\nDo not modify the product (geometry, shape etc.).'
        : prompt.trim();
      const tasks: { ratio: string; variantIndex: number; variantLabel: string }[] = [];
      selectedRatios.forEach((ratio) => {
        productImages.forEach((_, variantIndex) => {
          const label = productVariantLabels[variantIndex]?.trim() || `Wersja ${variantIndex + 1}`;
          tasks.push({ ratio, variantIndex, variantLabel: label });
        });
      });

      const promises = tasks.map(async (task) => {
        try {
          const url = await generateImage(
            effectivePrompt,
            AppMode.PRODUCT_PLACEMENT,
            task.ratio,
            productImages[task.variantIndex],
            enhancements,
            resolution
          );
          return { status: 'fulfilled' as const, value: url, ...task };
        } catch (error) {
          return { status: 'rejected' as const, reason: error, ...task };
        }
      });

      const results = await Promise.all(promises);

      const successfulImages: GeneratedImage[] = [];
      let firstSuccess: GeneratedImage | null = null;

      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          const ratioLabel = ASPECT_RATIOS.find(r => r.id === result.ratio)?.label || result.ratio;
          const newEntry: GeneratedImage = {
            id: Date.now() + Math.random(),
            url: result.value,
            timestamp: Date.now(),
            prompt: prompt,
            type: 'composition',
            styleName,
            ratioLabel,
            productName: productName.trim(),
            variantLabel: result.variantLabel,
            ratioId: result.ratio,
            variantIndex: result.variantIndex,
          };
          successfulImages.push(newEntry);
          if (!firstSuccess) firstSuccess = newEntry;
        } else {
          console.error(`Failed to generate ratio ${result.ratio} variant ${result.variantIndex}:`, result.reason);
        }
      });

      if (successfulImages.length > 0) {
        setHistory(prev => [...successfulImages, ...prev]);
        setCurrentImage(firstSuccess);
        
        // Scroll to result
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      } else {
        throw new Error("Wszystkie generacje zakończyły się niepowodzeniem.");
      }

    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd podczas generowania. Sprawdź konsolę lub spróbuj ponownie.");
    } finally {
      setIsGenerating(false);
    }
  };

  const getFilename = (img: GeneratedImage) => {
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\-_]/g, '_').replace(/_+/g, '_');
    const nameBase = img.productName ? sanitize(img.productName) : 'nanostudio';
    const variantPart = img.variantLabel ? sanitize(img.variantLabel) : '';
    const nameAndVariant = variantPart ? `${nameBase}_${variantPart}` : nameBase;
    const ratioPart = sanitize(img.ratioLabel);
    const shortId = String(img.id).slice(-6);
    return `${nameAndVariant}_${ratioPart}_${shortId}.png`;
  };

  const getReelFilename = () => {
    const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9\-_]/g, '_').replace(/_+/g, '_');
    const prefix = productName.trim() ? sanitize(productName.trim()) : 'nanostudio';
    return `${prefix}_reel_${Date.now()}.mp4`;
  };

  /** Pobiera plik z podanego URL; jeśli przeglądarka wspiera, otwiera okno "Zapisz jako". */
  const saveFileWithPicker = async (url: string, suggestedName: string) => {
    if ('showSaveFilePicker' in window) {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        const ext = suggestedName.includes('.') ? suggestedName.split('.').pop() : '';
        const types = ext === 'mp4'
          ? [{ description: 'Wideo MP4', accept: { 'video/mp4': ['.mp4'] } }]
          : [{ description: 'Obraz PNG', accept: { 'image/png': ['.png'] } }];
        // @ts-expect-error - showSaveFilePicker is not in all TS libs
        const handle = await window.showSaveFilePicker({ suggestedName, types });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'AbortError') return;
        console.warn('showSaveFilePicker failed', err);
      }
    }
    const link = document.createElement('a');
    link.href = url;
    link.download = suggestedName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startReelFromImage = (image: GeneratedImage) => {
    setReelSourceImage(image);
    setUseFirstFrameForReel(true);
    setActiveTab('reel');
    setReelPrompt('');
  };

  const handleGenerateReel = async () => {
    if (!reelPrompt.trim()) {
      alert("Proszę wybrać preset lub wpisać opis sceny do rolki.");
      return;
    }
    if (!canGenerateReel()) {
      alert("Dzienny limit rolek (3) został wykorzystany. Spróbuj jutro.");
      return;
    }
    setIsGeneratingReel(true);
    setReelVideoUrl(null);
    try {
      const firstFrame = reelSourceImage?.url ?? (useFirstFrameForReel ? (currentImage?.url ?? productImages[0]) : null);
      const url = await generateReel(reelPrompt.trim(), firstFrame ?? undefined);
      setReelVideoUrl(url);
      incrementReelUsage();
    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd podczas generowania rolki. Sprawdź konsolę lub spróbuj ponownie.");
    } finally {
      setIsGeneratingReel(false);
    }
  };

  const reelUsage = getReelUsageToday();

  const handleReset = () => {
    // Only ask for confirmation if there is data to lose
    const hasData = history.length > 0 || productImages.length > 0 || prompt.length > 0 || selectedStyleId !== '' || productName !== '' || resolution !== '2K';
    
    if (!hasData || window.confirm("Czy na pewno chcesz zresetować aplikację? Historia generacji zostanie usunięta.")) {
      setHistory([]);
      setCurrentImage(null);
      setPrompt('');
      setProductName('');
      setProductImages([]);
      setProductVariantLabels([]);
      setSelectedStyleId('');
      setSelectedRatios(['1:1']);
      setActiveTab('arrangement');
      setEnhancements({ lighting: 'natural', shadows: 'soft', autoColorMatch: true });
      setResolution('2K');
      setDoNotModifyProduct(true);
      setIsGenerating(false);
      setReelVideoUrl(null);
      setReelPrompt('');
      setReelSourceImage(null);
      setIsGeneratingReel(false);
      // Force recreation of uploader
      setResetKey(prev => prev + 1);
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Czy na pewno chcesz usunąć wszystkie obrazy z historii?")) {
      setHistory([]);
      setCurrentImage(null);
    }
  };

  const handleRegenerateImage = async (img: GeneratedImage) => {
    const variantIdx = img.variantIndex ?? 0;
    const productImage = productImages[variantIdx] ?? productImages[0];
    if (!productImage) {
      alert("Nie można wygenerować ponownie: brak zdjęcia produktu dla tego wariantu. Upewnij się, że lista zdjęć produktu zawiera odpowiedni wariant.");
      return;
    }
    const ratioId = img.ratioId ?? ASPECT_RATIOS.find(r => r.label === img.ratioLabel)?.id ?? '1:1';
    const effectivePrompt = doNotModifyProduct
      ? img.prompt.trim() + '\n\nDo not modify the product (geometry, shape etc.).'
      : img.prompt.trim();
    setRegeneratingId(img.id);
    try {
      const url = await generateImage(
        effectivePrompt,
        AppMode.PRODUCT_PLACEMENT,
        ratioId,
        productImage,
        enhancements,
        resolution
      );
      const updated: GeneratedImage = {
        ...img,
        url,
        timestamp: Date.now(),
      };
      setHistory(prev => prev.map(item => (item.id === img.id ? updated : item)));
      if (currentImage?.id === img.id) setCurrentImage(updated);
    } catch (error) {
      console.error(error);
      alert("Wystąpił błąd podczas ponownego generowania. Sprawdź konsolę lub spróbuj ponownie.");
    } finally {
      setRegeneratingId(null);
    }
  };

  const handleDownloadAll = async () => {
    if (history.length === 0) return;

    let useFileSystemApi = false;

    // Try to use File System Access API first
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker();
        
        let savedCount = 0;

        for (const img of history) {
          try {
            const filename = getFilename(img);
            // Create file handle
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            // Create writable stream
            const writable = await fileHandle.createWritable();
            
            // Convert base64 to blob
            const response = await fetch(img.url);
            const blob = await response.blob();
            
            // Write
            await writable.write(blob);
            await writable.close();
            savedCount++;
          } catch (err) {
            console.error(`Failed to save ${img.id}`, err);
          }
        }
        
        alert(`Pomyślnie zapisano ${savedCount} plików w wybranym folderze.`);
        useFileSystemApi = true;

      } catch (err: any) {
        if (err.name === 'AbortError') return;
        console.warn("File System Access API failed, falling back.", err);
      }
    }

    if (!useFileSystemApi) {
      if (window.confirm("Bezpośredni zapis do folderu nie jest dostępny. Pobrać pliki jeden po drugim?")) {
        for (const img of history) {
          try {
            const link = document.createElement('a');
            link.href = img.url;
            link.download = getFilename(img);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            await new Promise(resolve => setTimeout(resolve, 600));
          } catch (e) {
            console.error("Download failed for item", img.id, e);
          }
        }
      }
    }
  };

  const livingStyles = STYLES.filter(s => s.category === 'Living');
  const kidsStyles = STYLES.filter(s => s.category === 'Kids');
  
  // Logic for displaying info about selected ratios
  const showRatioInfo = selectedRatios.length === 1;
  const currentRatioInfo = showRatioInfo ? ASPECT_RATIOS.find(r => r.id === selectedRatios[0]) : null;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30">
      {/* Header */}
      <header className="bg-[#1e293b]/80 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/50">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              NanoStudio AI
            </h1>
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-slate-400">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Gemini 3 Pro Image
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Controls */}
          <div className="lg:col-span-4 space-y-8">
            
            <div className="flex justify-end">
                <button 
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Nowy Projekt (Reset)
                </button>
            </div>

            {/* Tab Switcher */}
            <div className="bg-[#1e293b] p-1 rounded-xl flex gap-1 border border-slate-700">
              <button
                onClick={() => setActiveTab('arrangement')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'arrangement'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Aranżacja Produktu
              </button>
              <button
                onClick={() => setActiveTab('reel')}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === 'reel'
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                Generator rolek
              </button>
            </div>
            
            {/* Product Name Input */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-300">
                  Nazwa Produktu / Projektu
                </label>
                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Wymagane</span>
              </div>
              <input
                ref={productNameInputRef}
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="Np. Fotel Uszak Velvet"
                className="w-full bg-[#1e293b] border border-slate-600 rounded-xl p-3 text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              />
              <p className="text-[10px] text-slate-500">
                Nazwa ta zostanie użyta w nazwie generowanych plików (np. {productName ? productName.replace(/[^a-zA-Z0-9\-_]/g, '_') : 'nazwa'}_001.png)
              </p>
            </div>

            {/* Aranżacja: Product Upload, enhancements, format, style, prompt, generate */}
            {activeTab === 'arrangement' && (
              <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-300">Zdjęcia produktu (wersje kolorystyczne)</label>
                <span className="text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">Min. 1</span>
              </div>
              <ProductVariantsUploader
                key={`uploader-${resetKey}`}
                images={productImages}
                onImagesChange={setProductImages}
                variantLabels={productVariantLabels}
                onVariantLabelsChange={setProductVariantLabels}
                resetKey={resetKey}
              />
            </div>
            
            {/* ENHANCEMENTS SECTION */}
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 space-y-4">
               <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                 </svg>
                 Zaawansowane Ulepszenia
               </h3>
               
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-slate-400">Oświetlenie</label>
                   <select 
                     value={enhancements.lighting}
                     onChange={(e) => setEnhancements(prev => ({...prev, lighting: e.target.value as any}))}
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                   >
                     <option value="natural">Naturalne (Okno)</option>
                     <option value="studio">Studio (Softbox)</option>
                     <option value="warm">Złota Godzina</option>
                     <option value="dramatic">Dramatyczne</option>
                   </select>
                 </div>
                 
                 <div className="space-y-1">
                   <label className="text-xs font-medium text-slate-400">Cienie</label>
                   <select 
                     value={enhancements.shadows}
                     onChange={(e) => setEnhancements(prev => ({...prev, shadows: e.target.value as any}))}
                     className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                   >
                     <option value="soft">Miękkie (Ambient)</option>
                     <option value="hard">Ostre (Słońce)</option>
                     <option value="dynamic">Dynamiczne</option>
                   </select>
                 </div>
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-medium text-slate-400">Rozdzielczość</label>
                 <div className="flex gap-2">
                   {(['1K', '2K', '4K'] as const).map((res) => (
                     <button
                       key={res}
                       type="button"
                       onClick={() => setResolution(res)}
                       className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all ${
                         resolution === res
                           ? 'bg-indigo-600 border-indigo-500 text-white'
                           : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                       }`}
                     >
                       {res}
                     </button>
                   ))}
                 </div>
                 <p className="text-[10px] text-slate-500 mt-1">Wyższa rozdzielczość = lepsza jakość, dłuższy czas generowania.</p>
               </div>

               <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-lg border border-slate-700/50">
                  <span className="text-xs text-slate-300">Dopasuj kolory tła do produktu</span>
                  <button 
                    role="switch"
                    aria-checked={enhancements.autoColorMatch}
                    onClick={() => setEnhancements(prev => ({...prev, autoColorMatch: !prev.autoColorMatch}))}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${
                      enhancements.autoColorMatch ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`${
                        enhancements.autoColorMatch ? 'translate-x-5' : 'translate-x-1'
                      } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
               </div>
            </div>

            {/* Aspect Ratio Selector (Multi-Select) */}
            <div className="space-y-3">
               <div className="flex items-center justify-between">
                 <label className="text-sm font-semibold text-slate-300">
                  Format Obrazu
                 </label>
                 <span className="text-xs text-slate-500">
                   {selectedRatios.length} wybrano
                 </span>
               </div>
              <div className="grid grid-cols-2 gap-2">
                {ASPECT_RATIOS.map((ratio) => {
                  const isSelected = selectedRatios.includes(ratio.id);
                  return (
                    <button
                      key={ratio.id}
                      onClick={() => toggleRatio(ratio.id)}
                      className={`p-3 rounded-lg border text-left transition-all duration-200 flex flex-col gap-1 relative overflow-hidden group ${
                        isSelected 
                          ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500' 
                          : 'bg-[#1e293b] border-slate-700 hover:border-slate-500 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-sm font-bold ${isSelected ? 'text-indigo-300' : 'text-slate-200'}`}>
                          {ratio.label}
                        </span>
                        {/* Checkbox visual */}
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                          isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 group-hover:border-slate-500'
                        }`}>
                          {isSelected && (
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] opacity-70">
                        {ratio.category}
                      </span>
                    </button>
                  );
                })}
              </div>
              
              {showRatioInfo && currentRatioInfo && (
                <div className={`mt-2 p-3 rounded-lg text-xs leading-relaxed border ${
                  currentRatioInfo.id === '9:16' 
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                }`}>
                  <p className="font-semibold mb-1">{currentRatioInfo.description}</p>
                  <p className="opacity-80">{currentRatioInfo.usageTip}</p>
                </div>
              )}
              {!showRatioInfo && selectedRatios.length > 1 && (
                <div className="mt-2 p-3 rounded-lg text-xs leading-relaxed border bg-slate-800/50 border-slate-700 text-slate-400">
                  <p>Wybrano {selectedRatios.length} formaty. Aplikacja wygeneruje osobny obraz dla każdego z nich.</p>
                </div>
              )}
            </div>

              </>
            )}

            {/* Generator rolek (zakładka Reel) */}
            {activeTab === 'reel' && (
            <div className="bg-slate-800/40 rounded-xl p-4 border border-slate-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-indigo-300">Generator rolek</h3>
                <span className="text-xs text-slate-400">
                  Rolki dziś: {reelUsage.used} / {reelUsage.limit}
                </span>
              </div>

              {/* Klatka startowa: wybrane zdjęcie ze sceny */}
              {reelSourceImage ? (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-slate-900/60 border border-amber-500/30">
                  <img src={reelSourceImage.url} alt="Klatka startowa" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-amber-200">Klatka startowa: scena z aranżacji</p>
                    {reelSourceImage.productName && (
                      <p className="text-[10px] text-slate-400 truncate">{reelSourceImage.productName}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setReelSourceImage(null)}
                    className="text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded border border-slate-600 hover:bg-slate-700"
                  >
                    Usuń
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFirstFrameForReel}
                    onChange={(e) => setUseFirstFrameForReel(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  Użyj bieżącego obrazu jako pierwszej klatki
                </label>
              )}

              {/* Presety rolek */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400">Preset lub własny opis</p>
                <div className="flex flex-wrap gap-2">
                  {REEL_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setReelPrompt(preset.prompt)}
                      className={`text-left px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                        reelPrompt === preset.prompt
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-[#1e293b] border-slate-600 text-slate-300 hover:border-indigo-500/50 hover:text-indigo-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={reelPrompt}
                onChange={(e) => setReelPrompt(e.target.value)}
                placeholder="Wybierz preset powyżej lub wpisz własny opis ruchu kamery / sceny (ok. 8 s)..."
                className="w-full bg-[#1e293b] border border-slate-600 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 outline-none resize-none min-h-[80px]"
              />

              <Button
                onClick={handleGenerateReel}
                isLoading={isGeneratingReel}
                disabled={!canGenerateReel() || isGeneratingReel || !reelPrompt.trim()}
                className="w-full py-2 text-sm"
              >
                {isGeneratingReel ? 'Generowanie rolki (Veo)…' : 'Generuj rolkę'}
              </Button>
              {isGeneratingReel && (
                <p className="text-[10px] text-slate-500">To może zająć do kilku minut.</p>
              )}
            </div>
            )}
          </div>

          {/* RIGHT COLUMN: Preview & History (zależnie od zakładki) */}
          <div className="lg:col-span-8 space-y-8">
            
            {activeTab === 'arrangement' && (
            <>
            {/* Styl Aranżacji – w głównej kolumnie nad Wynik */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300">
                Styl Aranżacji
              </label>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => selectStyleById('')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                      !selectedStyleId
                        ? 'bg-indigo-600 border-indigo-500 text-white ring-2 ring-indigo-500'
                        : 'bg-[#1e293b] border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-200'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Własny opis / Bez stylu
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setSalonCategoryOpen((v) => !v)}
                    className="flex items-center gap-2 w-full text-left text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${salonCategoryOpen ? '' : '-rotate-90'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Salon / Dorośli
                  </button>
                  {salonCategoryOpen && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {livingStyles.map((style) => {
                      const isSelected = selectedStyleId === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => selectStyleById(style.id)}
                          className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all text-left ${
                            isSelected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {style.imageUrl ? (
                            <>
                              <img
                                src={style.imageUrl}
                                alt={style.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const next = (e.target as HTMLImageElement).nextElementSibling;
                                  if (next) (next as HTMLElement).classList.remove('hidden');
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStylePreviewId(style.id); }}
                                className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                                title="Podgląd w pełnym rozmiarze"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </button>
                            </>
                          ) : null}
                          <div className={`absolute inset-0 bg-slate-700 flex flex-col items-center justify-center p-2 ${style.imageUrl ? 'hidden' : ''}`}>
                            <span className="text-xs font-medium text-slate-300 text-center line-clamp-2">{style.name}</span>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                            <span className="text-xs font-medium text-white drop-shadow">{style.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setKidsCategoryOpen((v) => !v)}
                    className="flex items-center gap-2 w-full text-left text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${kidsCategoryOpen ? '' : '-rotate-90'}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                    Pokoje Dziecięce
                  </button>
                  {kidsCategoryOpen && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {kidsStyles.map((style) => {
                      const isSelected = selectedStyleId === style.id;
                      return (
                        <button
                          key={style.id}
                          type="button"
                          onClick={() => selectStyleById(style.id)}
                          className={`relative aspect-[4/3] rounded-xl overflow-hidden border-2 transition-all text-left ${
                            isSelected ? 'border-indigo-500 ring-2 ring-indigo-500' : 'border-slate-600 hover:border-slate-500'
                          }`}
                        >
                          {style.imageUrl ? (
                            <>
                              <img
                                src={style.imageUrl}
                                alt={style.name}
                                className="absolute inset-0 w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  const next = (e.target as HTMLImageElement).nextElementSibling;
                                  if (next) (next as HTMLElement).classList.remove('hidden');
                                }}
                              />
                              <button
                                type="button"
                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setStylePreviewId(style.id); }}
                                className="absolute top-1.5 right-1.5 z-10 w-7 h-7 rounded-lg bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
                                title="Podgląd w pełnym rozmiarze"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                              </button>
                            </>
                          ) : null}
                          <div className={`absolute inset-0 bg-slate-700 flex flex-col items-center justify-center p-2 ${style.imageUrl ? 'hidden' : ''}`}>
                            <span className="text-xs font-medium text-slate-300 text-center line-clamp-2">{style.name}</span>
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex flex-col justify-end p-2 pointer-events-none">
                            <span className="text-xs font-medium text-white drop-shadow">{style.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  )}
                </div>
              </div>
              {selectedStyleId && (
                <p className="text-xs text-slate-400 mt-2 px-1">
                  {STYLES.find(s => s.id === selectedStyleId)?.description}
                </p>
              )}
            </div>

            {/* Szczegóły scenografii (Prompt) – w głównym widoku */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-slate-300">
                Szczegóły scenografii (Prompt)
              </label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Wybierz styl powyżej lub wpisz własny opis: Np. na drewnianym stole w słonecznej kuchni..."
                  className="w-full bg-[#1e293b] border border-slate-600 rounded-xl p-4 min-h-[120px] text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none transition-all"
                />
                <div className="absolute bottom-3 right-3 text-xs text-slate-500">
                  {prompt.length} znaków
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doNotModifyProduct}
                  onChange={(e) => setDoNotModifyProduct(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                />
                Do not modify the product (geometry, shape etc.)
              </label>
            </div>

            <Button 
              onClick={handleGenerate} 
              isLoading={isGenerating} 
              className="w-full py-4 text-lg"
            >
              {isGenerating 
                ? `Generowanie (${selectedRatios.length * productImages.length})...` 
                : selectedRatios.length * productImages.length > 1 
                  ? `Generuj ${selectedRatios.length * productImages.length} scen` 
                  : 'Generuj Scenerię'
              }
            </Button>

            {/* Main Result Area */}
            <div className="space-y-4" ref={scrollRef}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-white">
                  Wynik {currentImage ? `(${currentImage.ratioLabel})` : ''}
                </h2>
                {currentImage && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleRegenerateImage(currentImage)}
                      disabled={regeneratingId === currentImage.id || productImages.length === 0}
                      className="text-sm text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Wygeneruj tę aranżację ponownie (zastąpi obecny obraz)"
                    >
                      {regeneratingId === currentImage.id ? (
                        <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                      Wygeneruj ponownie
                    </button>
                    <button
                      type="button"
                      onClick={() => startReelFromImage(currentImage)}
                      className="text-sm text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
                      title="Generuj rolkę z tej sceny"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Generuj rolkę
                    </button>
                    <button
                      type="button"
                      onClick={() => saveFileWithPicker(currentImage.url, getFilename(currentImage))}
                      className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Pobierz: {getFilename(currentImage)}
                    </button>
                  </div>
                )}
              </div>
              
              <div className={`bg-[#1e293b] border border-slate-700 rounded-2xl min-h-[500px] flex items-center justify-center overflow-hidden relative shadow-2xl transition-all duration-300 ${
                  // Dynamic aspect ratio based on currently displayed image or first selection
                  currentImage ? '' : // Let image define size if present
                  (selectedRatios.length === 1 && selectedRatios[0] === '9:16') ? 'aspect-[9/16] max-h-[800px]' : 
                  (selectedRatios.length === 1 && selectedRatios[0] === '3:4') ? 'aspect-[3/4] max-h-[800px]' :
                  (selectedRatios.length === 1 && selectedRatios[0] === '16:9') ? 'aspect-video' : 'aspect-square'
              }`}>
                {isGenerating ? (
                  <div className="flex flex-col items-center gap-4 animate-pulse">
                    <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-medium">Tworzenie fotorealistycznych aranżacji ({selectedRatios.length})...</p>
                    <p className="text-xs text-slate-500">To może potrwać dłuższą chwilę</p>
                  </div>
                ) : currentImage ? (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                      src={currentImage.url} 
                      alt="Generated Scene" 
                      className={`w-full h-full object-contain ${regeneratingId === currentImage.id ? 'opacity-40' : ''}`}
                    />
                    {regeneratingId === currentImage.id && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/60">
                        <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                        <p className="text-slate-300 text-sm mt-2">Generowanie ponowne...</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 max-w-sm px-6">
                    <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
                      <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <p className="text-lg font-medium text-slate-400 mb-2">Brak wygenerowanego obrazu</p>
                    <p className="text-sm">Wybierz styl i format, aby stworzyć aranżację.</p>
                  </div>
                )}
              </div>
            </div>

            {/* History Grid */}
            {history.length > 0 && (
              <div className="space-y-4 pt-8 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-300">Ostatnie generacje</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleClearHistory}
                      className="text-sm text-red-400 hover:text-red-300 flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/10 transition-all"
                      title="Usuń wszystkie obrazy z historii"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Wyczyść
                    </button>
                    <button 
                      onClick={handleDownloadAll}
                      className="text-sm text-slate-400 hover:text-white flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 transition-all"
                      title="Wybierz folder na dysku, aby zapisać wszystkie obrazy"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Pobierz wszystko ({history.length})
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {history.map((item, idx) => (
                    <div 
                      key={item.id} 
                      onClick={() => setCurrentImage(item)}
                      className={`group relative aspect-square bg-slate-800 rounded-lg overflow-hidden cursor-pointer border transition-all ${
                        currentImage?.id === item.id ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <img 
                        src={item.url} 
                        alt="History item" 
                        className={`w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity ${regeneratingId === item.id ? 'opacity-50' : ''}`}
                      />
                      {regeneratingId === item.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70">
                          <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                        <div className="flex flex-col items-start gap-1 w-full">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleRegenerateImage(item); }}
                              disabled={regeneratingId === item.id || productImages.length === 0}
                              className="text-[10px] font-medium text-emerald-300 hover:text-emerald-200 flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 disabled:opacity-50"
                              title="Wygeneruj tę aranżację ponownie"
                            >
                              {regeneratingId === item.id ? (
                                <span className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              )}
                              Ponów
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); startReelFromImage(item); }}
                              className="text-[10px] font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30"
                              title="Generuj rolkę z tej sceny"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                              Rolka
                            </button>
                          </div>
                          {item.productName && (
                            <span className="text-[10px] text-white font-bold truncate w-full">
                              {item.productName}
                            </span>
                          )}
                          <div className="flex justify-between items-end w-full">
                            <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded">
                              {item.ratioLabel}
                            </span>
                            <span className="text-[9px] text-slate-300 uppercase tracking-wider">
                              {item.type === 'composition' ? 'Aranżacja' : 'Tło'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            </>
            )}

            {/* Zakładka Reel: podgląd i pobieranie rolki */}
            {activeTab === 'reel' && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white">Rolka (9:16)</h2>
                {isGeneratingReel ? (
                  <div className="bg-[#1e293b] border border-slate-700 rounded-2xl aspect-[9/16] max-h-[600px] flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3 animate-pulse">
                      <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                      <p className="text-slate-400 text-sm">Generowanie rolki (Veo)…</p>
                      <p className="text-xs text-slate-500">To może zająć do kilku minut</p>
                    </div>
                  </div>
                ) : reelVideoUrl ? (
                  <div className="space-y-2">
                    <div className="bg-[#1e293b] border border-slate-700 rounded-2xl overflow-hidden aspect-[9/16] max-h-[600px]">
                      <video src={reelVideoUrl} controls className="w-full h-full object-contain" />
                    </div>
                    <button
                      type="button"
                      onClick={() => saveFileWithPicker(reelVideoUrl, getReelFilename())}
                      className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Pobierz rolkę: {getReelFilename()}
                    </button>
                  </div>
                ) : (
                  <div className="bg-[#1e293b] border border-slate-700 rounded-2xl min-h-[400px] flex items-center justify-center text-center text-slate-500 px-6">
                    <div>
                      <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-600">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="font-medium text-slate-400 mb-2">Brak wygenerowanej rolki</p>
                      <p className="text-sm">Wpisz opis i kliknij „Generuj rolkę” w panelu po lewej.</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </main>

      {/* Pop-up podglądu zdjęcia stylu w pełnym rozmiarze */}
      {stylePreviewId && (() => {
        const style = STYLES.find(s => s.id === stylePreviewId);
        if (!style?.imageUrl) return null;
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
            onClick={() => setStylePreviewId(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Podgląd stylu"
          >
            <div
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setStylePreviewId(null)}
                className="absolute -top-10 right-0 w-9 h-9 rounded-full bg-slate-700 hover:bg-slate-600 text-white flex items-center justify-center transition-colors z-10"
                aria-label="Zamknij"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={style.imageUrl}
                alt={style.name}
                className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-lg shadow-2xl"
              />
              <p className="mt-2 text-sm font-medium text-white drop-shadow">{style.name}</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default App;