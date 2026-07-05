import { getDb } from '../../../lib/d1-db';
import { notFound } from 'next/navigation';
import { ShieldCheck, MapPin, Building2, CheckCircle2 } from 'lucide-react';
import PrintButton from './PrintButton';

export default async function CertificatePage({ params }) {
  const { token } = params;
  if (!token) notFound();

  const db = getDb();
  
  const org = await db.get('SELECT * FROM organizations WHERE payment_token = ?', [token]);
  if (!org || (org.status !== 'Completed' && !org.ack_number)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-gray-100 max-w-md">
          <ShieldCheck size={48} className="text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800">Certificate not available</h1>
          <p className="text-gray-500 mt-2 text-sm">This registration is either not yet completed or the acknowledgement number has not been generated.</p>
        </div>
      </div>
    );
  }

  const metrics = await db.get('SELECT * FROM metrics WHERE org_id = ?', [org.id]);
  const address = await db.get('SELECT * FROM lgd_addresses WHERE org_id = ?', [org.id]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-10 print:py-0 print:bg-white">
      <div className="max-w-[21cm] w-full bg-white shadow-2xl print:shadow-none mx-4 relative overflow-hidden" style={{ minHeight: '29.7cm' }}>
        
        {/* Certificate Header Banner */}
        <div className="bg-emerald-900 text-white p-8 pb-12 rounded-b-[4rem] text-center print:rounded-none relative">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 0%, #fff 0%, transparent 70%)' }}></div>
          <div className="relative z-10">
            <div className="flex justify-center mb-5 mt-4">
              <ShieldCheck size={64} className="text-emerald-400 drop-shadow-md" />
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold uppercase tracking-widest text-emerald-50 mb-3 drop-shadow-sm">Filing Acknowledgement</h1>
            <p className="text-emerald-200 text-lg uppercase tracking-[0.2em] font-medium">Indian Waste Portal · CPCB SWM 2026 filing record</p>
          </div>
        </div>

        {/* Certificate Body */}
        <div className="px-8 md:px-16 py-12">
          
          <div className="text-center mb-12">
            <p className="text-gray-400 uppercase tracking-[0.25em] text-sm font-semibold mb-4">This confirms Indian Waste Portal filed the CPCB SWM registration for</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">{org.org_name}</h2>
            <p className="text-lg text-gray-600 font-medium">Represented by <span className="text-gray-800 font-bold">{org.auth_person}</span></p>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-3xl p-8 mb-12 flex flex-col md:flex-row gap-8 items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-50 -mr-10 -mt-10"></div>
            <div className="relative z-10 flex-1 text-center border-b md:border-b-0 md:border-r border-emerald-200/60 pb-6 md:pb-0 md:pr-6">
              <p className="text-xs uppercase tracking-widest text-emerald-600 font-bold mb-2">CPCB Acknowledgement Number</p>
              <p className="font-mono text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{org.ack_number}</p>
            </div>
            <div className="relative z-10 flex-1 text-center pt-2 md:pt-0">
              <p className="text-xs uppercase tracking-widest text-emerald-600 font-bold mb-2">Service Category</p>
              <p className="text-xl font-bold text-gray-900">{org.category}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
            <div>
              <h3 className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-gray-400 border-b border-gray-100 pb-3 mb-5">
                <MapPin size={16} /> Registered Address
              </h3>
              <p className="text-gray-800 leading-relaxed font-medium text-lg">
                {address?.full_address}<br/>
                {address?.city_name}, {address?.district_name}<br/>
                {address?.state_name} - {address?.pincode}
              </p>
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-xs uppercase tracking-widest font-bold text-gray-400 border-b border-gray-100 pb-3 mb-5">
                <Building2 size={16} /> Facility Details
              </h3>
              <ul className="space-y-4 text-gray-800 font-medium text-lg">
                <li className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Floor Area:</span>
                  <span>{metrics?.floor_area_sqm} <span className="text-sm text-gray-400">sq.m</span></span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Waste Generation:</span>
                  <span>{metrics?.waste_kg_per_day} <span className="text-sm text-gray-400">kg/day</span></span>
                </li>
                <li className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Bulk Generator:</span>
                  <span className={metrics?.is_bulk_waste_generator ? "text-emerald-600" : ""}>{metrics?.is_bulk_waste_generator ? 'Yes' : 'No'}</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-t border-gray-100 pt-12 text-center">
            <div className="bg-emerald-50 text-emerald-500 p-3 rounded-full mb-5">
              <CheckCircle2 size={40} />
            </div>
            <p className="text-xl font-bold text-gray-900 mb-1">Filing Submitted to CPCB</p>
            <p className="text-gray-500 font-medium uppercase tracking-widest text-sm">{org.portal_status || 'Pending Verification at ULB'}</p>
            <p className="text-[11px] text-gray-400 mt-8 leading-relaxed max-w-xl mx-auto">
              This is a filing record issued by Indian Waste Portal — an independent consultant, <strong>not a government body</strong> and not affiliated with CPCB.
              The official acknowledgement is CPCB No. <span className="font-mono">{org.ack_number}</span>, verifiable at swm.cpcb.gov.in.
              Generated on {new Date().toLocaleDateString('en-IN')}.
            </p>
          </div>

        </div>

        <PrintButton token={token} />

      </div>
    </div>
  );
}
