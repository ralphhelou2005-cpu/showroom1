'use client';
import { useEffect } from 'react';
import { startBuild } from '@/lib/build';

/* starts hold-to-build on its section's own markup, and stops it on leaving */
export default function BuildEngine() {
  useEffect(() => startBuild(document.getElementById('build')!), []);
  return null;
}
