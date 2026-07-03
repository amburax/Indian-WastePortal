'use client';
/**
 * CapabilityMosaic — "Concept B" capability-proof band.
 * Staggered photo mosaic proving coverage across every waste stream.
 *
 * Photos live in /public/mosaic/<key>.jpg  →  drop your real facility/fleet
 * images there with the filenames below. Any missing file automatically falls
 * back to a labelled placeholder (see onError), so the layout never breaks.
 *   mrf.jpg · biogas.jpg · fleet.jpg · compost.jpg · baling.jpg · sanit.jpg
 */
const TILES = [
  { key: 'mrf',     label: 'Material Recovery Facility', stream: 'Dry waste',    span: 'md:col-span-2 md:row-span-2', fallback: 'https://picsum.photos/seed/iwp-mrf/800/800' },
  { key: 'biogas',  label: 'Biomethanation Plant',       stream: 'Wet waste',    span: '',                            fallback: 'https://picsum.photos/seed/iwp-biogas/600/600' },
  { key: 'fleet',   label: 'Collection Fleet',           stream: 'Door-to-door', span: '',                            fallback: 'https://picsum.photos/seed/iwp-fleet/600/600' },
  { key: 'compost', label: 'In-vessel Composting',       stream: 'Wet waste',    span: 'md:col-span-2',               fallback: 'https://picsum.photos/seed/iwp-compost/800/500' },
  { key: 'baling',  label: 'Dry Waste Baling',           stream: 'Recyclables',  span: '',                            fallback: 'https://picsum.photos/seed/iwp-baling/600/600' },
  { key: 'sanit',   label: 'Sanitary & Special Care',    stream: 'Hazardous',    span: '',                            fallback: 'https://picsum.photos/seed/iwp-sanitary/600/600' },
];

export default function CapabilityMosaic() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <span className="section-label">Capability proof</span>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-slate-800 mt-2">
            Proven across <span className="text-ruby-800">every stream</span>
          </h2>
          <p className="text-slate-500 mt-3 max-w-2xl mx-auto">
            From material recovery and biomethanation to a GPS-tracked collection fleet — the
            on-ground infrastructure behind compliant, end-to-end waste management.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[150px] md:auto-rows-[170px] gap-3">
          {TILES.map(t => (
            <figure key={t.key}
              className={`relative overflow-hidden rounded-2xl hairline group ${t.span}`}>
              <img
                src={`/mosaic/${t.key}.png`}
                alt={t.label}
                loading="lazy"
                onError={(e) => { if (e.currentTarget.src !== t.fallback) e.currentTarget.src = t.fallback; }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <figcaption className="absolute bottom-0 left-0 right-0 p-3">
                <span className="inline-block text-[10px] font-semibold uppercase tracking-wider text-brass-light bg-black/30 rounded-full px-2 py-0.5 mb-1">
                  {t.stream}
                </span>
                <p className="text-white font-semibold text-sm leading-tight drop-shadow">{t.label}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
