/**
 * Transforms any YouTube URL into an embeddable URL.
 * Supports:
 *   https://www.youtube.com/watch?v=VIDEO_ID
 *   https://youtu.be/VIDEO_ID
 *   https://www.youtube.com/embed/VIDEO_ID  (returned as-is)
 *
 * Returns null if the URL is not a recognizable YouTube URL.
 */
export function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;

  // Already an embed URL
  if (url.includes('youtube.com/embed/')) return url;

  let videoId: string | null = null;

  // https://www.youtube.com/watch?v=VIDEO_ID (also handles &t=, &list=, etc.)
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) videoId = watchMatch[1];

  // https://youtu.be/VIDEO_ID
  if (!videoId) {
    const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
    if (shortMatch) videoId = shortMatch[1];
  }

  if (!videoId) return null;

  return `https://www.youtube.com/embed/${videoId}`;
}

/** Returns true if the URL is a recognizable YouTube link. */
export function isYouTubeUrl(url: string): boolean {
  return getYouTubeEmbedUrl(url) !== null;
}
