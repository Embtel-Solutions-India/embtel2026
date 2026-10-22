// The one allow-list of remote image hosts. Used by next.config images.remotePatterns, CSP img-src,
// the post-body sanitiser and post/author image fields, so an image is either allowed everywhere or nowhere.
// Reads process.env directly (no memoised env) because next.config and the proxy use it too.
export function imageHosts(): string[] {
  const hosts = ['images.unsplash.com'];
  const base = process.env.AWS_S3_PUBLIC_URL_BASE;
  if (base && /^https:\/\//.test(base)) {
    try {
      hosts.push(new URL(base).host);
    } catch {
      // malformed base: ignore rather than break every page
    }
  }
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION;
  if (bucket && region && /^[a-z0-9.-]{3,63}$/.test(bucket) && /^[a-z0-9-]+$/.test(region)) {
    hosts.push(`${bucket}.s3.${region}.amazonaws.com`);
  }
  return [...new Set(hosts)];
}

// Root-relative paths, or https URLs on an allowed host.
export function isAllowedImageUrl(src: string): boolean {
  if (/^\/(?!\/)/.test(src)) return true;
  if (!/^https:\/\//.test(src)) return false;
  try {
    return imageHosts().includes(new URL(src).host);
  } catch {
    return false;
  }
}
