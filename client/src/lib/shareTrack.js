/**
 * shareTrack — share a track via Web Share API (mobile) or copy to clipboard (desktop).
 * Returns { method: 'share' | 'clipboard' | 'error', error? }
 */
export async function shareTrack(track) {
  if (!track) return { method: 'error', error: 'No track provided' };

  const url = track.deepLink || `https://www.deezer.com/track/${track.sourceId || ''}`;
  const text = `🎵 ${track.title} — ${track.artist}`;
  const shareData = {
    title: `SwipeSound: ${track.title}`,
    text,
    url,
  };

  // Web Share API — works natively on mobile
  if (navigator.share) {
    try {
      await navigator.share(shareData);
      return { method: 'share' };
    } catch (err) {
      if (err.name === 'AbortError') return { method: 'abort' }; // user cancelled — not an error
      // Fall through to clipboard
    }
  }

  // Clipboard fallback
  const shareText = `${text}\n${url}`;
  try {
    await navigator.clipboard.writeText(shareText);
    return { method: 'clipboard' };
  } catch (err) {
    // Last resort — prompt
    try {
      window.prompt('Copy this link:', shareText);
      return { method: 'prompt' };
    } catch {
      return { method: 'error', error: String(err) };
    }
  }
}
