import type { Metadata } from 'next';
import { ResetForm } from '../forms';

export const metadata: Metadata = { title: 'Forgot your password' };

export default function ForgotPage() {
  return (
    <>
      <h1 className="text-[clamp(34px,6vw,44px)]">A new password</h1>
      <p className="mt-3 mb-8 text-muted">Enter the email you sign in with, and we’ll email you a link to choose a new password.</p>
      <ResetForm />
      <p className="mt-8 text-center text-[15px]"><a className="text-champagne underline-offset-4 hover:underline" href="/admin/login">Back to sign in</a></p>
    </>
  );
}
