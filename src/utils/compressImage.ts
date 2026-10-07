/**
 * Compresses an image File to a maximum of 150 KB using the Canvas API.
 * Iteratively reduces JPEG quality until the file is within the size limit.
 * Returns the original file unchanged if it is already within the limit or not a supported raster image type.
 */
const MAX_SIZE_BYTES = 150 * 1024; // 150 KB

export async function compressImage(file: File): Promise<File> {
  // Only compress raster images (skip SVG, GIF, etc.)
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return file;
  }

  // Already within limit – no compression needed
  if (file.size <= MAX_SIZE_BYTES) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback: return original if canvas is unavailable
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0);

      // Iteratively lower quality until the blob is ≤ 150 KB
      let quality = 0.9;
      const outputType = file.type === "image/png" ? "image/jpeg" : file.type;

      const tryCompress = () => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            if (blob.size <= MAX_SIZE_BYTES || quality <= 0.1) {
              const compressed = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              });
              console.log(
                `📸 [Image Compression] File: "${file.name}" | Original: ${(file.size / 1024).toFixed(1)} KB ➔ Compressed: ${(compressed.size / 1024).toFixed(1)} KB (Quality: ${(quality * 100).toFixed(0)}%)`
              );
              resolve(compressed);
            } else {
              quality = Math.max(quality - 0.1, 0.1);
              tryCompress();
            }
          },
          outputType,
          quality,
        );
      };

      tryCompress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file); // Fallback: return original
    };

    img.src = objectUrl;
  });
}
