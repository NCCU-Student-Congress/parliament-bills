import { defineEventHandler } from 'h3';
import { markRecentWrite } from '../utils/edgeCache';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Whoever changes data reads straight from D1 for a while, so they never see a cached old copy.
export default defineEventHandler((event) => {
  if (SAFE_METHODS.has(event.method) || !event.path.startsWith('/api/')) return;
  markRecentWrite(event);
});
