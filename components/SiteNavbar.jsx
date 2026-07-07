'use client';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { useI18n } from '../lib/i18n';

/**
 * Shared site navbar — the dashboard's green bar, used on every page for a
 * consistent header. Logo + nav menu + language switcher; pass `right` for any
 * page-specific trailing content (a context label, account actions, etc.).
 */
export default function SiteNavbar({ right = null }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-40 bg-[#0e3b2e]/95 backdrop-blur-md shadow-lg border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/10 backdrop-blur-md border border-white/20">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-display text-xl font-bold text-white tracking-tight">Indian Waste<span className="text-[#c8a24b]">Portal</span></span>
        </Link>
        {/* Nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-white/90">
          <Link href="/#whats-new"    className="hover:text-white transition-colors">{t('pg.nav.swm')}</Link>
          <Link href="/#services"     className="hover:text-white transition-colors">{t('nav.services')}</Link>
          <Link href="/#how-it-works" className="hover:text-white transition-colors">{t('nav.how')}</Link>
          <Link href="/#pricing"      className="hover:text-white transition-colors">{t('nav.pricing')}</Link>
        </nav>
        {/* Right */}
        <div className="flex items-center gap-3">
          <LanguageSwitcher dark className="hidden sm:inline-flex" />
          {right}
        </div>
      </div>
    </header>
  );
}
