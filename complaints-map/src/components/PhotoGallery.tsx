import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { STRINGS, type Lang } from '../lib/i18n';

type PhotoGalleryProps = {
  photos: string[];
  label: string;
  lang: Lang;
};

function PhotoGallery({ photos, label, lang }: PhotoGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const t = STRINGS[lang];

  const close = useCallback(() => setActiveIndex(null), []);

  const showPrev = useCallback(() => {
    setActiveIndex((index) => (index === null ? null : (index - 1 + photos.length) % photos.length));
  }, [photos.length]);

  const showNext = useCallback(() => {
    setActiveIndex((index) => (index === null ? null : (index + 1) % photos.length));
  }, [photos.length]);

  useEffect(() => {
    if (activeIndex === null) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowLeft') showPrev();
      if (event.key === 'ArrowRight') showNext();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeIndex, close, showNext, showPrev]);

  if (photos.length === 0) return null;

  const lightbox =
    activeIndex !== null
      ? createPortal(
          <div className="photo-gallery__lightbox" onClick={close} role="presentation">
            <div
              className="photo-gallery__viewer"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={label}
            >
              <button type="button" className="photo-gallery__close" onClick={close} aria-label={t.galleryClose}>
                ×
              </button>
              <img
                src={photos[activeIndex]}
                alt={`${label} ${activeIndex + 1}`}
                className="photo-gallery__image"
              />
              <div className="photo-gallery__controls">
                <button type="button" className="photo-gallery__nav" onClick={showPrev}>
                  {t.galleryPrev}
                </button>
                <span className="photo-gallery__counter">
                  {t.galleryCounter(activeIndex + 1, photos.length)}
                </span>
                <button type="button" className="photo-gallery__nav" onClick={showNext}>
                  {t.galleryNext}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="photo-gallery">
      <p className="photo-gallery__label">
        <strong>{label}:</strong>
      </p>
      <div className="photo-gallery__thumbs">
        {photos.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            className="photo-gallery__thumb-btn"
            onClick={() => setActiveIndex(index)}
            aria-label={`${label} ${index + 1}`}
          >
            <img src={url} alt="" className="photo-gallery__thumb" />
          </button>
        ))}
      </div>
      {lightbox}
    </div>
  );
}

export default PhotoGallery;
