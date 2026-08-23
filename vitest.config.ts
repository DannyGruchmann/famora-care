/**
 * Runner settings on top of the ones the Angular builder generates.
 *
 * Default export because Vitest requires one — the same exception Next.js pages get.
 */
export default {
  test: {
    // Vitest's default is 10 seconds. That is enough for a single spec and too tight once several
    // page specs boot a whole component tree in parallel: the file scheduled first then times out
    // in its setup hook without a single assertion having run. Raised rather than worked around,
    // because the specs are heavy for a good reason and CI runners are slower than this machine.
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
};
