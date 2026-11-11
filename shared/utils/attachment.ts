export function normalizeAttachmentUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const input = value.trim();
  if (!input || /\s/.test(input) || input.startsWith('/') || input.startsWith('\\')) return null;

  const scheme = input.match(/^([a-z][a-z\d+.-]*):/i);
  const hasHttpScheme = /^https?:\/\//i.test(input);
  const hasPortWithoutScheme = /^[^/:?#]+:\d+(?:[/?#]|$)/.test(input);
  if (scheme && !hasHttpScheme && !hasPortWithoutScheme) return null;
  if (input.includes('://') && !hasHttpScheme) return null;

  try {
    const url = new URL(hasHttpScheme ? input : `https://${input}`);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname) return null;
    return url.href;
  } catch {
    return null;
  }
}
