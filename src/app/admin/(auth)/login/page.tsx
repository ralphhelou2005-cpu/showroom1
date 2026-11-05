import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentStaff, safeNext } from '@/lib/staff';
import { SignInForm } from '../forms';

export const metadata: Metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await currentStaff()) redirect(safeNext(next));
  return (
    <>
      <h1 className="text-[clamp(34px,6vw,44px)]">Sign in</h1>
      <p className="mt-3 mb-8 text-muted">The Milcar dashboard, for the showroom’s team.</p>
      <SignInForm next={next && safeNext(next) === next ? next : undefined} />
      <p className="mt-8 text-center text-[15px]"><a className="text-champagne underline-offset-4 hover:underline" href="/admin/forgot">Forgot your password?</a></p>
    </>
  );
}
