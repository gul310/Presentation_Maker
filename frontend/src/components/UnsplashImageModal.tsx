import React, { useState, useEffect } from 'react';
import { Search, X, Image as ImageIcon, ExternalLink, Loader2, AlertCircle, Trash2, Check } from 'lucide-react';
import type { SlideImage } from '../types/presentation';
import { searchUnsplashImages, trackImageDownload, getUnsplashStatus } from '../services/presentationApi';

interface UnsplashImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (image: SlideImage) => Promise<void>;
  onRemoveImage?: () => Promise<void>;
  initialQuery?: string;
  currentImage?: SlideImage | null;
  slideTitle?: string;
}

export const UnsplashImageModal: React.FC<UnsplashImageModalProps> = ({
  isOpen,
  onClose,
  onSelectImage,
  onRemoveImage,
  initialQuery = '',
  currentImage,
  slideTitle = ''
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [photos, setPhotos] = useState<SlideImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [rateLimitRemaining, setRateLimitRemaining] = useState<number | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(currentImage?.photo_id || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const defaultQuery = (initialQuery || slideTitle || '').replace(/[^\w\s]/g, ' ').trim();
      setQuery(defaultQuery);
      setSelectedPhotoId(currentImage?.photo_id || null);
      setErrorMsg(null);

      // Check status & load initial results
      getUnsplashStatus()
        .then(status => {
          setIsConfigured(status.configured);
          setRateLimitRemaining(status.rate_limit_remaining);
          if (status.configured && defaultQuery) {
            handleSearch(defaultQuery);
          }
        })
        .catch(() => {
          setIsConfigured(false);
        });
    }
  }, [isOpen, initialQuery, slideTitle]);

  if (!isOpen) return null;

  const handleSearch = async (searchQuery: string) => {
    const q = searchQuery.trim();
    if (!q) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await searchUnsplashImages(q, 1, 12, 'landscape');
      setPhotos(data.results || []);
      setRateLimitRemaining(data.rate_limit_remaining);
      if (!data.results || data.results.length === 0) {
        setErrorMsg(`No high-quality landscape photos found for "${q}". Try a different keyword.`);
      }
    } catch (err: any) {
      console.error('Unsplash search error:', err);
      const detail = err.data?.detail || err.message || 'Failed to search Unsplash photos.';
      if (err.status === 503 || detail.includes('UNSPLASH_NOT_CONFIGURED')) {
        setErrorMsg('Unsplash API credentials (UNSPLASH_ACCESS_KEY) are not configured on the backend server.');
        setIsConfigured(false);
      } else if (err.status === 429 || detail.includes('rate limit')) {
        setErrorMsg('Unsplash hourly API rate limit reached. Please try again shortly or use existing photos.');
      } else {
        setErrorMsg(detail);
      }
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };

  const handleChoosePhoto = async (photo: SlideImage) => {
    setSelectedPhotoId(photo.photo_id || null);
    setSaving(true);
    try {
      // Trigger Unsplash download tracking
      if (photo.download_location) {
        trackImageDownload(photo.download_location).catch(() => {});
      }
      await onSelectImage(photo);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply image to slide.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!onRemoveImage) return;
    setSaving(true);
    try {
      await onRemoveImage();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to remove image.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#FFFFFF] dark:bg-[#2D2320] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#D0AE92]/30 dark:border-[#8C7D70]/30 bg-[#F9F2E4]/40 dark:bg-[#3E3731]/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 flex items-center justify-center text-[var(--color-primary)]">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#2D2320] dark:text-[#FFFFFF]">
                {currentImage ? 'Replace Slide Photograph' : 'Add Unsplash Photograph'}
              </h2>
              <p className="text-xs text-[#77574A] dark:text-[#A89A8E]">
                High-resolution context-aware photography powered by Unsplash
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#77574A] dark:text-[#A89A8E] hover:bg-[#D0AE92]/20 dark:hover:bg-[#8C7D70]/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Actions */}
        <div className="p-6 border-b border-[#D0AE92]/20 dark:border-[#8C7D70]/20 space-y-3">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77574A] dark:text-[#A89A8E]" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Unsplash (e.g., healthcare laboratory, quantum technology, leadership)..."
                className="w-full pl-10 pr-4 py-2.5 bg-[#F9F2E4]/80 dark:bg-[#3E3731] border border-[#D0AE92]/50 dark:border-[#8C7D70]/40 rounded-xl text-xs sm:text-sm text-[#2D2320] dark:text-[#FFFFFF] placeholder-[#77574A]/60 dark:placeholder-[#A89A8E]/60 focus:outline-none focus:border-[var(--color-primary)]"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-2.5 bg-[var(--color-primary)] hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              Search
            </button>
            {currentImage && onRemoveImage && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={saving}
                className="px-4 py-2.5 border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            )}
          </form>

          {/* Quick Category Chips */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-[#77574A] dark:text-[#A89A8E]">
            <span className="font-semibold text-[11px] uppercase tracking-wider">Suggested:</span>
            {['Technology', 'Healthcare', 'Business', 'Education', 'Nature', 'Innovation'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setQuery(cat);
                  handleSearch(cat);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#F9F2E4] dark:bg-[#3E3731] hover:bg-[var(--color-primary)]/15 hover:text-[var(--color-primary)] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 text-[11px] font-medium transition-colors"
              >
                {cat}
              </button>
            ))}
          </div>

          {rateLimitRemaining !== null && (
            <div className="text-[11px] text-[#77574A] dark:text-[#A89A8E] flex items-center justify-between">
              <span>API Rate Limit Remaining: <strong>{rateLimitRemaining}</strong> requests</span>
              <a
                href="https://unsplash.com/?utm_source=presentation_maker&utm_medium=referral"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 font-medium"
              >
                Photos provided by Unsplash <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto">
          {errorMsg && (
            <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Notice</p>
                <p className="mt-0.5 opacity-90">{errorMsg}</p>
              </div>
            </div>
          )}

          {isConfigured === false && (
            <div className="text-center py-10 px-4 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#2D2320] dark:text-[#FFFFFF]">
                Unsplash Credentials Not Configured
              </h3>
              <p className="text-xs text-[#77574A] dark:text-[#A89A8E] max-w-md mx-auto">
                To search and embed live Unsplash photography, configure <code className="px-1.5 py-0.5 rounded bg-[#F9F2E4] dark:bg-[#3E3731] font-mono text-[11px]">UNSPLASH_ACCESS_KEY</code> in <code className="px-1.5 py-0.5 rounded bg-[#F9F2E4] dark:bg-[#3E3731] font-mono text-[11px]">backend-node/.env</code>.
              </p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#77574A] dark:text-[#A89A8E]">
              <Loader2 className="w-7 h-7 animate-spin text-[var(--color-primary)]" />
              <p className="text-xs font-medium">Searching Unsplash photography...</p>
            </div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {photos.map((photo) => {
                const isSelected = selectedPhotoId === photo.photo_id;
                return (
                  <div
                    key={photo.photo_id}
                    className={`group relative rounded-xl overflow-hidden border transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/40 shadow-md'
                        : 'border-[#D0AE92]/40 dark:border-[#8C7D70]/40 hover:border-[var(--color-primary)]/70 hover:shadow-lg'
                    }`}
                    onClick={() => handleChoosePhoto(photo)}
                  >
                    {/* Image Preview */}
                    <div className="h-44 w-full bg-[#F9F2E4] dark:bg-[#3E3731] overflow-hidden relative">
                      <img
                        src={photo.small_url || photo.url}
                        alt={photo.alt_text || 'Unsplash photograph'}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {isSelected && (
                        <div className="absolute top-2 right-2 bg-[var(--color-primary)] text-white p-1 rounded-full shadow-md">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                      )}
                      
                      {/* Hover Overlay Button */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="px-3 py-1.5 bg-white text-[#2D2320] text-xs font-bold rounded-lg shadow-md transform translate-y-1 group-hover:translate-y-0 transition-transform">
                          {isSelected ? 'Selected' : 'Use This Image'}
                        </span>
                      </div>
                    </div>

                    {/* Attribution Caption */}
                    <div className="p-2.5 bg-[#FFFFFF] dark:bg-[#3E3731] border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/30 flex items-center justify-between text-[11px]">
                      <div className="truncate mr-2 text-[#77574A] dark:text-[#A89A8E]">
                        <span>Photo by </span>
                        <a
                          href={photo.photographer_profile_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-[#2D2320] dark:text-[#FFFFFF] hover:text-[var(--color-primary)] underline"
                        >
                          {photo.photographer_name}
                        </a>
                      </div>
                      <a
                        href={photo.photo_page_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="View photo on Unsplash"
                        className="text-[#77574A] dark:text-[#A89A8E] hover:text-[var(--color-primary)] shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !loading && isConfigured && (
            <div className="text-center py-16 text-[#77574A] dark:text-[#A89A8E] space-y-2">
              <ImageIcon className="w-8 h-8 mx-auto opacity-40 mb-1" />
              <p className="text-xs font-medium">Enter a topic above and click Search to discover photographs.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#D0AE92]/30 dark:border-[#8C7D70]/30 bg-[#F9F2E4]/40 dark:bg-[#3E3731]/40 flex items-center justify-between">
          <p className="text-[11px] text-[#77574A] dark:text-[#A89A8E]">
            Images are embedded directly into PowerPoint (.pptx) exports with full attribution.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#F9F2E4] dark:bg-[#3E3731] hover:bg-[#D0AE92]/30 text-xs font-semibold rounded-xl text-[#2D2320] dark:text-[#FFFFFF] border border-[#D0AE92]/40 dark:border-[#8C7D70]/40 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
