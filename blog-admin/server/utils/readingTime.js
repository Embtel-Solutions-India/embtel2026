const WORDS_PER_MINUTE = 200;

// Strips HTML tags from rich-text content and estimates reading time in minutes.
function estimateReadingTime(html = '') {
  const text = html.replace(/<[^>]*>/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

module.exports = estimateReadingTime;
