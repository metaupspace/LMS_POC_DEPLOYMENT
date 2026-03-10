/**
 * Convert a Cloudinary video URL to an HLS streaming URL.
 * Works for any Cloudinary video — auto-generates HLS on first request.
 *
 * Input:  https://res.cloudinary.com/demo/video/upload/v123/lms/videos/intro.mp4
 * Output: https://res.cloudinary.com/demo/video/upload/sp_auto/v123/lms/videos/intro.m3u8
 */
export function getHlsUrl(cloudinaryUrl: string): string | null {
  if (!cloudinaryUrl || !cloudinaryUrl.includes('cloudinary.com')) return null;
  if (!cloudinaryUrl.includes('/video/upload/')) return null;

  // Insert sp_auto (streaming profile auto) before the version/path
  // and change extension to .m3u8
  const url = cloudinaryUrl.replace(
    '/video/upload/',
    '/video/upload/sp_auto/'
  );

  // Change extension to .m3u8
  const lastDot = url.lastIndexOf('.');
  if (lastDot === -1) return url + '.m3u8';
  return url.substring(0, lastDot) + '.m3u8';
}
