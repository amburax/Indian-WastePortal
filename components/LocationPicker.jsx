'use client';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { LocateFixed, Loader2 } from 'lucide-react';

// Emerald pin as an inline SVG divIcon — avoids Leaflet's broken default marker
// images under bundlers, and needs no external asset (CSP-safe).
const PIN_HTML = `
<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
     style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))">
  <path d="M12 22s7-6.2 7-12A7 7 0 1 0 5 10c0 5.8 7 12 7 12z" fill="#0e3b2e" stroke="#fff" stroke-width="1.5"/>
  <circle cx="12" cy="10" r="2.6" fill="#fde08b"/>
</svg>`;

const INDIA_CENTER = [22.9734, 78.6569];
const round6 = (n) => Math.round(Number(n) * 1e6) / 1e6;

/**
 * Map coordinate picker. IMPORTANT: this only reports latitude/longitude via
 * `onPick(lat, lng)` — it never reads or changes the address fields. A mistaken
 * tap only moves the (visible, editable) coordinates, not the typed address.
 */
export default function LocationPicker({ lat, lng, onPick }) {
  const elRef      = useRef(null);
  const mapRef     = useRef(null);
  const markerRef  = useRef(null);
  const onPickRef  = useRef(onPick);
  onPickRef.current = onPick;

  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState('');

  // Init the map once.
  useEffect(() => {
    if (mapRef.current || !elRef.current) return;

    const la = parseFloat(lat), ln = parseFloat(lng);
    const hasStart = !Number.isNaN(la) && !Number.isNaN(ln);
    const start = hasStart ? [la, ln] : INDIA_CENTER;

    const map = L.map(elRef.current, { scrollWheelZoom: false }).setView(start, hasStart ? 15 : 5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors', maxZoom: 19,
    }).addTo(map);

    const icon = L.divIcon({ className: 'iwp-pin', html: PIN_HTML, iconSize: [32, 32], iconAnchor: [16, 32] });
    const marker = L.marker(start, { draggable: true, icon, opacity: hasStart ? 1 : 0.55 }).addTo(map);

    const commit = (ll) => { marker.setOpacity(1); onPickRef.current?.(round6(ll.lat), round6(ll.lng)); };
    marker.on('dragend', () => commit(marker.getLatLng()));
    map.on('click', (e) => { marker.setLatLng(e.latlng); commit(e.latlng); });

    mapRef.current = map;
    markerRef.current = marker;
    // Leaflet needs a nudge when it mounts inside a just-laid-out container.
    setTimeout(() => map.invalidateSize(), 0);

    return () => { map.remove(); mapRef.current = null; markerRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the pin in sync if the user edits the lat/long boxes directly.
  useEffect(() => {
    const map = mapRef.current, marker = markerRef.current;
    if (!map || !marker) return;
    const la = parseFloat(lat), ln = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(ln)) return;
    const cur = marker.getLatLng();
    if (round6(cur.lat) !== round6(la) || round6(cur.lng) !== round6(ln)) {
      marker.setLatLng([la, ln]).setOpacity(1);
    }
  }, [lat, lng]);

  function useCurrentLocation() {
    setGeoError('');
    if (!navigator.geolocation) { setGeoError('Location is not supported on this device.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) mapRef.current.setView([latitude, longitude], 16);
        if (markerRef.current) markerRef.current.setLatLng([latitude, longitude]).setOpacity(1);
        onPickRef.current?.(round6(latitude), round6(longitude));
        setLocating(false);
      },
      (err) => {
        setGeoError(err.code === err.PERMISSION_DENIED
          ? 'Location permission denied — you can drop the pin manually instead.'
          : 'Could not get your location — drop the pin manually instead.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs text-slate-500">
          Tap the map or drag the pin to set your exact location — this fills only the coordinates below, not your address.
        </p>
        <button type="button" onClick={useCurrentLocation} disabled={locating}
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-ruby-800 border border-ruby-200 bg-ruby-50 hover:bg-ruby-100 rounded-lg px-3 py-1.5 disabled:opacity-60">
          {locating ? <Loader2 size={13} className="animate-spin" /> : <LocateFixed size={13} />}
          {locating ? 'Locating…' : 'Use my current location'}
        </button>
      </div>
      <div ref={elRef} className="w-full rounded-xl overflow-hidden border border-slate-200 z-0"
           style={{ height: 260 }} />
      {geoError && <p className="text-xs text-amber-700 mt-1.5">⚠️ {geoError}</p>}
    </div>
  );
}
