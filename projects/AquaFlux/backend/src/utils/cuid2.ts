import { createId, isCuid } from '@paralleldrive/cuid2';

/**
 * A utility object that wraps the cuid2 library functions.
 * This provides a consistent, aliased entry point for generating and validating CUIDs across the application.
 */
export const cuid2 = {
  createId,
  isCuid,
};
