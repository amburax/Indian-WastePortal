'use client';
import { Check } from 'lucide-react';
import { clsx } from 'clsx';
import { useI18n } from '../lib/i18n';

const getSteps = (t) => [
  { id: 1, label: t('sp.s1'),         description: t('sp.s1_d') },
  { id: 2, label: t('sp.s2'),    description: t('sp.s2_d') },
  { id: 3, label: t('sp.s3'),        description: t('sp.s3_d')  },
];

/**
 * StepProgress — Multi-step form progress indicator
 * Props:
 *   currentStep: 1 | 2 | 3 | 4
 */
export default function StepProgress({ currentStep = 1 }) {
  const { t } = useI18n();
  const STEPS = getSteps(t);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between relative">
        {/* Connector line */}
        <div className="absolute left-0 right-0 top-4 h-0.5 z-0"
             style={{ background: 'rgba(148,163,184,0.2)' }}>
          <div
            className="h-full transition-all duration-700"
            style={{
              background: 'linear-gradient(90deg, #16654a, #46a67c)',
              width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {STEPS.map((step) => {
          const isDone    = currentStep > step.id;
          const isActive  = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="flex flex-col items-center z-10 flex-1">
              {/* Dot */}
              <div className={clsx('step-dot', {
                active:  isActive,
                done:    isDone,
                pending: isPending,
              })}>
                {isDone
                  ? <Check size={14} strokeWidth={2.5} />
                  : <span>{step.id}</span>
                }
              </div>

              {/* Label */}
              <div className="mt-2 text-center hidden sm:block">
                <p className={clsx('text-xs font-semibold transition-colors', {
                  'text-ruby-800': isActive,
                  'text-emerald-700': isDone,
                  'text-slate-400': isPending,
                })}>
                  {step.label}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: current step label */}
      <div className="mt-4 text-center sm:hidden">
        <p className="text-sm font-semibold text-ruby-800">
          {t('sp.mob').replace('{step}', currentStep)}{STEPS[currentStep - 1]?.label}
        </p>
        <p className="text-xs text-slate-400">{STEPS[currentStep - 1]?.description}</p>
      </div>
    </div>
  );
}
