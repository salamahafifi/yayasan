export const MAX_PHOTOS = 3;

/**
 * Long edge in pixels. Enough to read a road sign or a house number, small
 * enough that three of them base64 comfortably inside one edge function call.
 */
const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.8;
const OUTPUT_MIME = 'image/jpeg';

/** Refuse the source file before spending memory decoding it. */
export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

/** Backstop in case a photo resists compression, e.g. dense noise. */
export const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

export type PhotoAttachment = {
  /** Stable key for React lists and for removal; blobs are not comparable. */
  id: string;
  blob: Blob;
  mime: string;
  /** Object URL for the thumbnail, revoked by the form context on removal. */
  url: string;
};

export type PhotoErrorCode = 'notImage' | 'tooLarge' | 'decode' | 'encode';

export type CompressResult =
  | { ok: true; photo: PhotoAttachment }
  | { ok: false; code: PhotoErrorCode };

function scaleToFit(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= MAX_DIMENSION) return { width, height };
  const ratio = MAX_DIMENSION / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

/**
 * createImageBitmap honours EXIF orientation, which matters because phones
 * store portrait shots rotated. The <img> path is a fallback for browsers
 * without it and will show such photos sideways, which beats rejecting them.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // HEIC and other formats the browser cannot decode land here.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('decode failed'));
      image.src = url;
    });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), OUTPUT_MIME, JPEG_QUALITY);
  });
}

/**
 * Re-encodes any picked image as a modest JPEG. Two jobs: keep the upload
 * small, and normalise iPhone HEIC into something the rest of the stack and
 * the staff dashboard can actually open.
 */
export async function compressImage(file: File): Promise<CompressResult> {
  if (!file.type.startsWith('image/')) return { ok: false, code: 'notImage' };
  if (file.size > MAX_SOURCE_BYTES) return { ok: false, code: 'tooLarge' };

  const source = await decode(file);
  if (!source) return { ok: false, code: 'decode' };

  const sourceWidth = 'naturalWidth' in source ? source.naturalWidth : source.width;
  const sourceHeight = 'naturalHeight' in source ? source.naturalHeight : source.height;
  if (!sourceWidth || !sourceHeight) return { ok: false, code: 'decode' };

  const { width, height } = scaleToFit(sourceWidth, sourceHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return { ok: false, code: 'encode' };

  // JPEG has no alpha channel, so transparent screenshots would otherwise
  // flatten onto black.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(source, 0, 0, width, height);

  if ('close' in source) source.close();

  const blob = await toBlob(canvas);
  if (!blob || blob.size === 0) return { ok: false, code: 'encode' };
  if (blob.size > MAX_PHOTO_BYTES) return { ok: false, code: 'tooLarge' };

  return {
    ok: true,
    photo: {
      id: crypto.randomUUID(),
      blob,
      mime: OUTPUT_MIME,
      url: URL.createObjectURL(blob),
    },
  };
}
