/// <reference types="next" />
/// <reference types="next/image-types/global" />

/* What `import photo from '….webp'` gives, for the type check that runs before `next build`: Next.js writes the same
   two lines into next-env.d.ts, but that file is made on each computer and isn't committed, so a fresh copy (Vercel)
   doesn't have it yet. */
