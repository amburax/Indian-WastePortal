import Link from 'next/link';
import { Compass } from 'lucide-react';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <div className="min-h-screen bg-mesh flex items-center justify-center px-4">
      <div className="max-w-md w-full glass-frosted rounded-2xl p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-ruby-50 flex items-center justify-center mx-auto mb-4">
          <Compass size={26} className="text-ruby-800" />
        </div>
        <p className="font-display text-5xl font-black text-ruby-800">404</p>
        <h1 className="font-display text-xl font-bold text-slate-800 mt-2">Page not found</h1>
        <p className="text-sm text-slate-500 mt-2">The page you’re looking for doesn’t exist or has moved.</p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <Link href="/" className="btn-ruby px-5 py-2.5 rounded-xl text-sm">Go home</Link>
          <Link href="/dashboard" className="btn-ghost px-5 py-2.5 rounded-xl text-sm">My dashboard</Link>
        </div>
      </div>
    </div>
  );
}
