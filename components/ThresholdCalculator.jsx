'use client';
import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const getThresholds = (t) => ({
  floor_area:  { value: 20000, unit: 'sqm',    label: t('tc.fl'),     description: t('tc.fl_d') },
  waste_kg:    { value: 100,   unit: 'kg/day',  label: t('tc.ws'), description: t('tc.ws_d') },
  water_liters:{ value: 40000, unit: 'L/day',   label: t('tc.wt'),description: t('tc.wt_d') },
});

function calcPercent(value, threshold) {
  if (!value || isNaN(value)) return 0;
  return Math.min((parseFloat(value) / threshold) * 100, 100);
}

function MetricRow({ id, label, description, unit, thresholdValue, value, onChange, t }) {
  const pct    = calcPercent(value, thresholdValue);
  const passed = parseFloat(value) >= thresholdValue;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">{label}</p>
          <p className="text-xs text-slate-400">{description}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {value && (
            passed
              ? <span className="badge badge-bwg flex items-center gap-1"><CheckCircle size={11} />{t('tc.pass')}</span>
              : <span className="text-xs text-slate-400">{t('tc.pct').replace('{pct}', Math.round(pct))}</span>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="relative">
        <input
          id={id}
          type="number"
          min="0"
          step="0.1"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('tc.ph').replace('{unit}', unit)}
          className="form-input pr-20 text-sm"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400 pointer-events-none">
          {unit}
        </span>
      </div>

      {/* Progress bar */}
      <div className="threshold-bar">
        <div
          className={`threshold-bar-fill ${passed ? 'active' : 'inactive'}`}
          style={{ width: `${pct}%` }}
        />
        {/* Threshold marker at 100% */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-ruby-800/50 rounded-full"
          style={{ left: '100%', transform: 'translate(-50%, -50%)' }}
        />
      </div>
    </div>
  );
}

/**
 * ThresholdCalculator
 * Props:
 *   onChange(metrics, isBWG): called whenever any value changes
 *   initialValues: { floor_area, waste_kg, water_liters }
 */
export default function ThresholdCalculator({ onChange, initialValues = {} }) {
  const { t } = useI18n();
  const THRESHOLDS = getThresholds(t);
  
  const [floorArea,   setFloorArea]   = useState(initialValues.floor_area   || '');
  const [wasteKg,     setWasteKg]     = useState(initialValues.waste_kg     || '');
  const [waterLiters, setWaterLiters] = useState(initialValues.water_liters || '');

  const floorPasses = parseFloat(floorArea)   >= THRESHOLDS.floor_area.value;
  const wastePasses = parseFloat(wasteKg)     >= THRESHOLDS.waste_kg.value;
  const waterPasses = parseFloat(waterLiters) >= THRESHOLDS.water_liters.value;

  const isBWG = floorPasses || wastePasses || waterPasses;
  const qualifying = [
    floorPasses && 'floor_area',
    wastePasses && 'waste_kg',
    waterPasses && 'water_liters',
  ].filter(Boolean);

  useEffect(() => {
    onChange?.(
      { floor_area: floorArea, waste_kg: wasteKg, water_liters: waterLiters },
      isBWG,
      qualifying,
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorArea, wasteKg, waterLiters]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-700">{t('tc.title')}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {t('tc.sub1')}<strong>{t('tc.sub2')}</strong>{t('tc.sub3')}
          </p>
        </div>
        {isBWG && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl animate-scale-in"
               style={{ background: 'rgba(22, 101, 74,0.08)', border: '1.5px solid rgba(22, 101, 74,0.2)' }}>
            <AlertTriangle size={14} className="text-ruby-800" />
            <span className="text-xs font-bold text-ruby-800">{t('tc.qual')}</span>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="space-y-4">
        <MetricRow
          id="floor_area"
          {...THRESHOLDS.floor_area}
          thresholdValue={THRESHOLDS.floor_area.value}
          value={floorArea}
          onChange={setFloorArea}
          t={t}
        />
        <div className="divider my-3" />
        <MetricRow
          id="waste_kg"
          {...THRESHOLDS.waste_kg}
          thresholdValue={THRESHOLDS.waste_kg.value}
          value={wasteKg}
          onChange={setWasteKg}
          t={t}
        />
        <div className="divider my-3" />
        <MetricRow
          id="water_liters"
          {...THRESHOLDS.water_liters}
          thresholdValue={THRESHOLDS.water_liters.value}
          value={waterLiters}
          onChange={setWaterLiters}
          t={t}
        />
      </div>

      {/* Result Banner */}
      {isBWG && (
        <div className="mt-2 p-4 rounded-xl animate-slide-up"
             style={{ background: 'rgba(22, 101, 74,0.06)', border: '1px solid rgba(22, 101, 74,0.18)' }}>
          <div className="flex gap-3">
            <Info size={16} className="text-ruby-800 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-ruby-800">{t('tc.yes_title')}</p>
              <p className="text-xs text-ruby-700/80 mt-1">
                {t('tc.yes_desc')}
              </p>
            </div>
          </div>
        </div>
      )}

      {!isBWG && (floorArea || wasteKg || waterLiters) && (
        <div className="mt-2 p-4 rounded-xl"
             style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)' }}>
          <div className="flex gap-3">
            <CheckCircle size={16} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-700">{t('tc.no_title')}</p>
              <p className="text-xs text-slate-500 mt-1">
                {t('tc.no_desc')}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
