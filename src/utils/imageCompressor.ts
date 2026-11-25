/**
 * In-browser Image Compressor & Permanent Base64 Data URL Converter
 *
 * Converts image files (WebP, PNG, JPEG, SVG) into lightweight, optimized Base64 Data URLs
 * that permanently persist in Cloud Firestore under the free Firebase Spark plan
 * without requiring Firebase Cloud Storage or producing ephemeral blob: URLs.
 */

export interface CompressedImageResult {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Compresses an image file in the browser and returns a Data URL.
 * Automatically downscales large images proportionally to fit within maxWidth x maxHeight.
 */
export async function compressImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82
): Promise<CompressedImageResult> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Image compression requires a browser environment.'));
      return;
    }

    // Handle SVG files directly without rasterizing to canvas
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        resolve({
          dataUrl,
          width: maxWidth,
          height: maxHeight,
          sizeBytes: file.size,
          mimeType: 'image/svg+xml',
        });
      };
      reader.onerror = () => reject(new Error('Failed to read SVG file.'));
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { naturalWidth: width, naturalHeight: height } = img;

        // Maintain aspect ratio while bounding within maxWidth x maxHeight
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to obtain canvas 2D rendering context.'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Attempt WebP compression first; fallback to JPEG
        let dataUrl = canvas.toDataURL('image/webp', quality);
        let mimeType = 'image/webp';

        if (!dataUrl.startsWith('data:image/webp')) {
          dataUrl = canvas.toDataURL('image/jpeg', quality);
          mimeType = 'image/jpeg';
        }

        const sizeBytes = Math.round((dataUrl.length * 3) / 4);

        resolve({
          dataUrl,
          width,
          height,
          sizeBytes,
          mimeType,
        });
      };
      img.onerror = () => reject(new Error('Failed to load image into memory.'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}
