// backend/src/utils/cloudinary.ts
/**
 * Cloudinary Image Transformation Utilities
 * 
 * Generates optimized image URLs with specific transformations
 * for different use cases (thumbnails, cards, detail views)
 */

interface CloudinaryTransformOptions {
  width: number;
  height: number;
  crop?: 'fill' | 'fit' | 'crop' | 'scale';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south';
  quality?: 'auto' | number;
  format?: 'auto' | 'jpg' | 'png' | 'webp';
}

/**
 * Extract public ID from Cloudinary URL
 * Example: https://res.cloudinary.com/demo/image/upload/v1234/sample.jpg
 * Returns: sample
 */
export function extractPublicId(cloudinaryUrl: string): string | null {
  try {
    const urlPattern = /\/upload\/(?:v\d+\/)?(.+)\.\w+$/;
    const match = cloudinaryUrl.match(urlPattern);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

/**
 * Generate Cloudinary transformation URL
 * 
 * @param originalUrl - Original Cloudinary URL
 * @param options - Transformation options
 * @returns Transformed URL with optimizations
 */
export function getCloudinaryUrl(
  originalUrl: string,
  options: CloudinaryTransformOptions
): string {
  if (!originalUrl || !originalUrl.includes('cloudinary.com')) {
    return originalUrl; // Return as-is if not a Cloudinary URL
  }

  const {
    width,
    height,
    crop = 'fill',
    gravity = 'auto',
    quality = 'auto',
    format = 'auto',
  } = options;

  // Build transformation string
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_${crop}`,
    `g_${gravity}`,
    `q_${quality}`,
    `f_${format}`,
  ].join(',');

  // Insert transformations into URL
  // Pattern: /upload/ -> /upload/{transformations}/
  return originalUrl.replace('/upload/', `/upload/${transformations}/`);
}

/**
 * Predefined transformation presets for different use cases
 */
export const CLOUDINARY_PRESETS = {
  // Inspiration Card (masonry grid)
  inspiration: {
    thumbnail: { width: 400, height: 500, crop: 'fill', gravity: 'auto' },   // Mobile
    card: { width: 800, height: 1000, crop: 'fill', gravity: 'auto' },        // Desktop
    detail: { width: 1600, height: 2000, crop: 'fill', gravity: 'auto' },     // Modal/Lightbox
  },

  // Designer Profile Cover
  cover: {
    mobile: { width: 800, height: 400, crop: 'fill', gravity: 'center' },
    desktop: { width: 1600, height: 400, crop: 'fill', gravity: 'center' },
    retina: { width: 3200, height: 800, crop: 'fill', gravity: 'center' },
  },

  // Avatar
  avatar: {
    small: { width: 48, height: 48, crop: 'fill', gravity: 'face' },
    medium: { width: 128, height: 128, crop: 'fill', gravity: 'face' },
    large: { width: 256, height: 256, crop: 'fill', gravity: 'face' },
  },

  // Portfolio (flexible aspect ratio)
  portfolio: {
    thumbnail: { width: 400, height: 300, crop: 'fill', gravity: 'auto' },
    card: { width: 800, height: 600, crop: 'fill', gravity: 'auto' },
    full: { width: 1920, height: 1080, crop: 'fit', gravity: 'center' },
  },
} as const;

/**
 * Generate responsive srcSet for <img> tags
 * 
 * @param originalUrl - Original Cloudinary URL
 * @param preset - Preset name from CLOUDINARY_PRESETS
 * @returns srcSet string for responsive images
 */
export function generateSrcSet(
  originalUrl: string,
  preset: keyof typeof CLOUDINARY_PRESETS
): string {
  const presetSizes = CLOUDINARY_PRESETS[preset];

  return (Object.values(presetSizes) as CloudinaryTransformOptions[])
    .map((options) => {
      const url = getCloudinaryUrl(originalUrl, options);
      return `${url} ${options.width}w`;
    })
    .join(', ');
}

/**
 * Get optimized URL for specific use case
 * 
 * @example
 * // In React component
 * const cardUrl = getOptimizedUrl(inspiration.beforeImage, 'inspiration', 'card');
 */
export function getOptimizedUrl(
  originalUrl: string,
  preset: keyof typeof CLOUDINARY_PRESETS,
  size: string
): string {
  const presetSizes = CLOUDINARY_PRESETS[preset] as Record<string, CloudinaryTransformOptions>;
  const options = presetSizes[size];

  if (!options) {
    console.warn(`Size "${size}" not found in preset "${preset}"`);
    return originalUrl;
  }

  return getCloudinaryUrl(originalUrl, options);
}

/**
 * Validate if URL is a Cloudinary URL
 */
export function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com') || url.includes('cloudinary.com');
}

/**
 * Get image dimensions from Cloudinary URL
 * Useful for calculating aspect ratios
 */
export function getImageDimensions(transformedUrl: string): { width: number; height: number } | null {
  const widthMatch = transformedUrl.match(/w_(\d+)/);
  const heightMatch = transformedUrl.match(/h_(\d+)/);

  if (widthMatch && heightMatch) {
    return {
      width: parseInt(widthMatch[1]),
      height: parseInt(heightMatch[1]),
    };
  }

  return null;
}

/**
 * Generate placeholder URL (low quality, blurred)
 * For progressive image loading
 */
export function getPlaceholderUrl(originalUrl: string): string {
  return getCloudinaryUrl(originalUrl, {
    width: 40,
    height: 50,
    quality: 20,
    format: 'auto',
    crop: 'fill',
  });
}

export default {
  getCloudinaryUrl,
  getOptimizedUrl,
  generateSrcSet,
  getPlaceholderUrl,
  isCloudinaryUrl,
  CLOUDINARY_PRESETS,
};