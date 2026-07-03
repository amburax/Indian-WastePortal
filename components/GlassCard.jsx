'use client';
import { clsx } from 'clsx';

/**
 * GlassCard — Reusable glassmorphism panel.
 * Props:
 *   variant: 'default' | 'sm' | 'frosted' | 'dark'
 *   className: additional tailwind classes
 *   children: React nodes
 *   hover: boolean — enable hover lift effect
 *   glow: boolean — enable ruby glow border
 */
export default function GlassCard({
  children,
  variant = 'default',
  className = '',
  hover = false,
  glow = false,
  onClick,
  ...props
}) {
  const base = {
    default: 'glass',
    sm:      'glass-sm',
    frosted: 'glass-frosted',
    dark:    'glass-dark',
  }[variant];

  return (
    <div
      onClick={onClick}
      className={clsx(
        base,
        'rounded-2xl',
        hover && 'transition-all duration-300 hover:-translate-y-1 hover:shadow-glass-lg cursor-pointer',
        glow  && 'border-ruby-800/30 shadow-ruby-glow',
        onClick && 'cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
