import { describe, expect, it } from 'vitest';
import { hasFailedToLoad } from './company-favicon';

describe('hasFailedToLoad', () => {
  it('treats a completed image without pixels as failed', () => {
    expect(hasFailedToLoad({ complete: true, naturalWidth: 0 })).toBe(true);
  });

  it('keeps a loaded image', () => {
    expect(hasFailedToLoad({ complete: true, naturalWidth: 32 })).toBe(false);
  });

  it('waits for a lazy image that has not been fetched yet', () => {
    expect(hasFailedToLoad({ complete: false, naturalWidth: 0 })).toBe(false);
  });
});
