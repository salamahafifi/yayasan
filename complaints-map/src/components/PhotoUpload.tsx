import { useRef, useState, type ChangeEvent } from 'react';
import {
  MAX_PHOTOS,
  compressImage,
  type PhotoAttachment,
  type PhotoErrorCode,
} from '../lib/photos';
import { t, type Lang } from '../i18n';

type Props = {
  lang: Lang;
  value: PhotoAttachment[];
  onChange: (photos: PhotoAttachment[]) => void;
  /** When true, the add control is hidden — the user opted out of photos. */
  optedOut?: boolean;
};

const ERROR_KEYS: Record<PhotoErrorCode, 'photosErrNotImage' | 'photosErrTooLarge' | 'photosErrDecode' | 'photosErrEncode'> = {
  notImage: 'photosErrNotImage',
  tooLarge: 'photosErrTooLarge',
  decode: 'photosErrDecode',
  encode: 'photosErrEncode',
};

export default function PhotoUpload({ lang, value, onChange, optedOut = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = optedOut ? 0 : MAX_PHOTOS - value.length;

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(event.target.files ?? []);
    // Reset immediately so picking the same file twice still fires a change.
    event.target.value = '';
    if (picked.length === 0) return;

    setError(null);
    setBusy(true);

    const accepted = picked.slice(0, remaining);
    const overLimit = picked.length > remaining;
    const added: PhotoAttachment[] = [];
    let failure: PhotoErrorCode | null = null;

    for (const file of accepted) {
      const result = await compressImage(file);
      if (result.ok) {
        added.push(result.photo);
      } else if (!failure) {
        failure = result.code;
      }
    }

    setBusy(false);
    if (added.length > 0) onChange([...value, ...added]);

    if (failure) {
      setError(t(lang, ERROR_KEYS[failure]));
    } else if (overLimit) {
      setError(t(lang, 'photosErrLimit', { max: MAX_PHOTOS }));
    }
  }

  function removeAt(id: string) {
    setError(null);
    onChange(value.filter((photo) => photo.id !== id));
  }

  return (
    <div className="photo-upload">
      <span className="field__label">{t(lang, 'photosLabel')}</span>
      <p className="field__note">{t(lang, 'photosHint', { max: MAX_PHOTOS })}</p>

      {value.length > 0 && (
        <ul className="photo-upload__list">
          {value.map((photo, index) => (
            <li key={photo.id} className="photo-upload__item">
              <img className="photo-upload__thumb" src={photo.url} alt="" />
              <button
                type="button"
                className="photo-upload__remove"
                onClick={() => removeAt(photo.id)}
                aria-label={t(lang, 'photosRemove', { index: index + 1 })}
              >
                &times;
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* No capture attribute on purpose: setting it forces the camera and
          hides the photo library, and most people are reporting something
          they already photographed. */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="photo-upload__input"
        onChange={(event) => void handleFiles(event)}
      />

      {remaining > 0 && (
        <button
          type="button"
          className="photo-upload__add"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy
            ? t(lang, 'photosProcessing')
            : value.length === 0
              ? t(lang, 'photosAdd')
              : t(lang, 'photosAddMore')}
        </button>
      )}

      <p className="field__hint" aria-live="polite">
        {value.length > 0 ? t(lang, 'photosCount', { count: value.length, max: MAX_PHOTOS }) : ''}
      </p>

      <p className="field__error" aria-live="polite">
        {error ?? ''}
      </p>
    </div>
  );
}
