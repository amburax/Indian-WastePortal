'use client';
import { Printer } from 'lucide-react';
import Link from 'next/link';

export default function PrintButton() {
  return (
    <>
      <div className="absolute top-6 left-6 print:hidden">
        <Link href="/dashboard" className="bg-white/20 hover:bg-white/30 backdrop-blur text-white px-4 py-2 rounded-full font-medium text-sm transition-colors border border-white/30">
          ← Back
        </Link>
      </div>
      <div className="absolute top-6 right-6 print:hidden">
        <button 
          type="button" 
          onClick={() => window.print()}
          className="bg-white text-emerald-900 hover:bg-emerald-50 shadow-lg px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-transform hover:scale-105 border border-emerald-100"
        >
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>
    </>
  );
}
