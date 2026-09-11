import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { subscribeAppointments } from '../../services/telemetry';
import AppointmentSlipModal from '../../components/common/AppointmentSlipModal';

export default function DoctorAppointments() {
  const navigate = useNavigate();
  const [toastMsg, setToastMsg] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [liveAppointments, setLiveAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlipApt, setSelectedSlipApt] = useState(null);

  const confirmedCount = liveAppointments.filter(a => a.status === 'CONFIRMED').length;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3500);
  };

  const fetchDoctorAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('ekavach_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/doctor/appointments', { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setLiveAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Failed to load doctor appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorAppointments();

    const unsubscribe = subscribeAppointments((event) => {
      console.log('⚡ [DoctorAppointments] Live appointment update:', event);
      fetchDoctorAppointments();
      if (event.message) {
        showToast(event.message);
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleApprove = async (apt) => {
    try {
      const token = localStorage.getItem('ekavach_token');
      const res = await fetch(`/api/doctor/appointments/${apt.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ status: 'CONFIRMED' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Approved slot for ${apt.patientName || 'Patient'}. ABDM slip verified.`);
        fetchDoctorAppointments();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDecline = async (apt) => {
    try {
      const token = localStorage.getItem('ekavach_token');
      const res = await fetch(`/api/doctor/appointments/${apt.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ status: 'DECLINED' }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Appointment for ${apt.patientName || 'Patient'} has been declined.`);
        fetchDoctorAppointments();
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const cycleSpecialtyFilter = () => {
    const filters = ['all', 'cardio', 'echo', 'teleconsult'];
    const nextIdx = (filters.indexOf(specialtyFilter) + 1) % filters.length;
    setSpecialtyFilter(filters[nextIdx]);
    showToast(`Filtered by specialty: ${filters[nextIdx].toUpperCase()}`);
  };

  const filteredAppointments = liveAppointments.filter(apt => {
    if (specialtyFilter === 'all') return true;
    const dep = (apt.department || '').toLowerCase();
    const mode = (apt.mode || '').toLowerCase();
    if (specialtyFilter === 'cardio') return dep.includes('cardio');
    if (specialtyFilter === 'teleconsult') return mode.includes('tele');
    return true;
  });

  return (
    <div className="w-full">
      {toastMsg && (
        <div className="mb-4 p-3 rounded-xl bg-[#E6FFFA] border border-[#02C39A]/30 text-[#028090] font-label-md text-sm flex items-center justify-between shadow-sm animate-fade-in">
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">verified</span>
            {toastMsg}
          </span>
          <button onClick={() => setToastMsg('')} className="text-[#028090] hover:opacity-75">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}
      {/* Page Header Section */}
<section className="bg-white border border-[#E0E3E6] rounded-[14px] p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
<div className="flex flex-col gap-1.5">
<div className="flex items-center gap-2 mb-0.5">
<span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E4E4FB] text-[#0B1F3A] text-[11px] font-bold tracking-wider font-space uppercase">
<span className="w-1.5 h-1.5 rounded-full bg-[#0B1F3A] animate-pulse"></span>
        CLINICIAN DESK
      </span>
<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#E6FFFA] border border-[#02C39A]/30 text-[#028090] text-[11px] font-semibold">
<span className="material-symbols-outlined text-[12px]">calendar_month</span>
        Bay 3 Interventional Unit
      </span>
</div>
<h1 className="font-space text-2xl lg:text-[32px] font-bold text-[#0B1F3A] tracking-tight leading-tight">
      Appointment Approvals
    </h1>
<p className="text-sm text-slate-500 font-normal">
      Review and manage incoming appointment requests.
    </p>
</div>
<div className="flex items-center gap-3 shrink-0 flex-wrap">
{/* Amber Pending Pill */}
<div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20 font-semibold text-xs tracking-wide shadow-sm">
<span className="w-2 h-2 rounded-full bg-[#D97706] animate-pulse"></span>
<span>{liveAppointments.filter(a => a.status !== 'CANCELLED').length} Active Bookings</span>
</div>
<button onClick={cycleSpecialtyFilter} className="inline-flex items-center gap-2 h-10 px-4 rounded-[14px] bg-white border border-[#E0E3E6] text-[#0B1F3A] hover:bg-slate-50 font-semibold text-xs tracking-wide transition-all shadow-sm cursor-pointer" type="button">
<span className="material-symbols-outlined text-[17px] text-slate-500">filter_list</span>
      Filter by Specialty {specialtyFilter !== 'all' ? `(${specialtyFilter.toUpperCase()})` : ''}
    </button>
<button onClick={() => showToast('Shift schedule: 08:00 - 16:00 • Bay 3 Interventional Unit • Active')} className="inline-flex items-center gap-2 h-10 px-4 rounded-[14px] bg-[#0B1F3A] hover:bg-[#132a4e] text-white font-semibold text-xs tracking-wide transition-all shadow-sm cursor-pointer" type="button">
<span className="material-symbols-outlined text-[18px]">schedule</span>
      Shift Schedule: Today
    </button>
</div>
</section>
{/* Quick KPI Metric Summary Strip */}
<section className="grid grid-cols-1 md:grid-cols-3 gap-5">
<div className="bg-white border border-[#E0E3E6] rounded-[14px] p-5 shadow-sm flex items-center justify-between">
<div className="flex flex-col">
<span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-space">AWAITING CLINICIAN REVIEW</span>
<span className="font-space text-[28px] font-bold text-[#D97706] mt-1 leading-tight">{liveAppointments.filter(a => a.status === 'PENDING').length} <span className="text-sm font-semibold text-slate-600">Pending</span></span>
<span className="text-xs text-slate-500 mt-1">Live queue synchronized</span>
</div>
<div className="w-12 h-12 rounded-[14px] bg-[#FEF3C7] flex items-center justify-center text-[#D97706]">
<span className="material-symbols-outlined text-[24px]">pending_actions</span>
</div>
</div>
<div className="bg-white border border-[#E0E3E6] rounded-[14px] p-5 shadow-sm flex items-center justify-between">
<div className="flex flex-col">
<span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-space">CONFIRMED SESSIONS TODAY</span>
<span className="font-space text-[28px] font-bold text-[#0B1F3A] mt-1 leading-tight">{confirmedCount} <span className="text-sm font-semibold text-slate-600">Confirmed</span></span>
<span className="text-xs text-slate-500 mt-1">Real-time patient bookings</span>
</div>
<div className="w-12 h-12 rounded-[14px] bg-[#E6FFFA] flex items-center justify-center text-[#00A896]">
<span className="material-symbols-outlined text-[24px]">check_circle</span>
</div>
</div>
<div className="bg-white border border-[#E0E3E6] rounded-[14px] p-5 shadow-sm flex items-center justify-between">
<div className="flex flex-col">
<span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-space">VIRTUAL CONSULTATIONS</span>
<span className="font-space text-[28px] font-bold text-[#0B1F3A] mt-1 leading-tight">{liveAppointments.filter(a => (a.mode || '').includes('TELE')).length} <span className="text-sm font-semibold text-slate-600">Teleconsults</span></span>
<span className="text-xs text-slate-500 mt-1">Encrypted ABHA tele-link active</span>
</div>
<div className="w-12 h-12 rounded-[14px] bg-[#E4E4FB] flex items-center justify-center text-[#3730A3]">
<span className="material-symbols-outlined text-[24px]">videocam</span>
</div>
</div>
</section>
{/* 4. Pending Appointments Module (Main Focus, Top) */}
<section className="bg-white border border-[#E0E3E6] rounded-[14px] shadow-sm overflow-hidden">
<div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-[12px] bg-[#FEF3C7] text-[#D97706] flex items-center justify-center">
<span className="material-symbols-outlined text-[22px]">assignment_late</span>
</div>
<div>
<div className="flex items-center gap-2.5">
<h2 className="font-space text-lg font-bold text-[#0B1F3A]">Live Clinical Appointments</h2>
<span className="px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#D97706]/20 text-[11px] font-bold font-space">
            {filteredAppointments.length} Active Slots
          </span>
</div>
<p className="text-xs text-slate-500 mt-0.5">Real-time patient bookings synced via E-KAVACH Telemetry Network</p>
</div>
</div>
<span className="text-xs text-slate-400 font-mono">Live Socket Sync: ACTIVE</span>
</div>
{/* Clean Rows List */}
<div className="flex flex-col divide-y divide-slate-100">
  {loading ? (
    <div className="p-8 text-center text-slate-500 text-sm">
      <span className="material-symbols-outlined text-[24px] animate-spin text-blue-600 mb-1">progress_activity</span>
      <div>Loading live doctor appointments...</div>
    </div>
  ) : filteredAppointments.length === 0 ? (
    <div className="p-8 text-center text-slate-500 text-sm">
      No appointment requests currently in queue. Real-time patient bookings will appear here instantly.
    </div>
  ) : (
    filteredAppointments.map((p) => {
      const isConfirmed = p.status === 'CONFIRMED';
      const isCancelled = p.status === 'CANCELLED';
      const isDeclined = p.status === 'DECLINED';
      const patientName = p.patientName || p.patientProfile?.name || 'Verified Patient';
      const initials = patientName.split(' ').map(n => n[0]).join('').slice(0, 2);

      return (
        <div key={p.id} className="p-5 hover:bg-[#F8FAFC] transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-full bg-[#0B1F3A] text-white flex items-center justify-center font-space font-bold text-sm shrink-0 mt-0.5">
              {initials}
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-space font-bold text-base text-[#0B1F3A]">{patientName}</span>
                <span className="text-xs font-medium text-slate-500">• {p.timeSlot || '10:30 AM'}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-space uppercase ${
                  isConfirmed 
                    ? 'bg-[#E6FFFA] text-[#028090]' 
                    : isDeclined 
                    ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                    : isCancelled 
                    ? 'bg-slate-100 text-slate-700' 
                    : 'bg-[#FEF3C7] text-[#D97706]'
                }`}>
                  {p.status}
                </span>
                <span className="px-2.5 py-0.5 rounded-full border text-[10px] font-semibold bg-slate-100 text-slate-600">
                  {p.mode || 'IN_PERSON'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Date: {new Date(p.scheduledAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })} • Slot: {p.timeSlot || '10:30 AM'}
              </p>
              <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-600 flex-wrap">
                <span className="material-symbols-outlined text-[15px] text-slate-400">notes</span>
                <span>Reason: <strong className="text-slate-700 font-medium">{p.symptoms || 'Clinical Consultation'}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="text-slate-500 font-mono text-[11px]">Token #{p.tokenNumber || p.id?.slice(0, 8)}</span>
                {p.patientPhone && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-mono text-[11px]">{p.patientPhone}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            <button
              onClick={() => setSelectedSlipApt(p)}
              className="h-9 px-3 rounded-[10px] border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">confirmation_number</span>
              Slip
            </button>
            {!isCancelled && !isDeclined && (
              <button onClick={() => handleDecline(p)} className="h-9 px-4 rounded-[10px] border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-colors shadow-sm cursor-pointer" type="button">
                Decline Slot
              </button>
            )}
            {!isConfirmed && (
              <button onClick={() => handleApprove(p)} className="h-9 px-5 rounded-[10px] bg-[#00A896] hover:bg-[#028090] text-white font-semibold text-xs tracking-wide transition-colors shadow-sm flex items-center gap-1.5 cursor-pointer" type="button">
                <span className="material-symbols-outlined text-[16px]">check</span>
                Approve Slot
              </button>
            )}
          </div>
        </div>
      );
    })
  )}
</div>
</section>
{/* 5. Upcoming Approved Appointments (Below, Secondary) */}
<section className="bg-white border border-[#E0E3E6] rounded-[14px] shadow-sm overflow-hidden flex flex-col">
<div className="p-6 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-[12px] bg-[#E6FFFA] text-[#00A896] flex items-center justify-center">
<span className="material-symbols-outlined text-[22px]">event_available</span>
</div>
<div>
<div className="flex items-center gap-2">
<h2 className="font-space text-lg font-bold text-[#0B1F3A]">Upcoming Approved Appointments</h2>
<span className="text-xs font-medium text-slate-500">(8 scheduled today &amp; tomorrow)</span>
</div>
<p className="text-xs text-slate-500 mt-0.5">Confirmed consultations verified through ABDM registry</p>
</div>
</div>
<div className="flex items-center gap-2">
<button onClick={() => showToast('ABDM Clinical Calendar synchronized: 12 sessions scheduled today.')} className="h-8 px-3 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer" type="button">
<span className="material-symbols-outlined text-[15px]">calendar_today</span>
        Open Calendar View
      </button>
</div>
</div>
{/* Table-style List */}
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-slate-100 bg-[#F8FAFC] text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-space">
<th className="py-3.5 px-6">Patient Name</th>
<th className="py-3.5 px-6">Date &amp; Time</th>
<th className="py-3.5 px-6">Location / Unit</th>
<th className="py-3.5 px-6">Primary Clinician</th>
<th className="py-3.5 px-6">Status</th>
<th className="py-3.5 px-6 text-right">Action</th>
</tr>
</thead>
<tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-medium">
{liveAppointments.filter(a => a.status === 'CONFIRMED').length === 0 ? (
  <tr>
    <td colSpan={6} className="py-8 text-center text-slate-400">
      No confirmed appointments in the live database right now.
    </td>
  </tr>
) : (
  liveAppointments.filter(a => a.status === 'CONFIRMED').map((apt) => {
    const pName = apt.patientName || apt.patientProfile?.name || 'Verified Patient';
    const initials = pName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'PT';
    let relationBadge = null;
    if (apt.notes) {
      try {
        const meta = JSON.parse(apt.notes);
        if (meta.relation && meta.relation !== 'Self') {
          relationBadge = `Kin: ${meta.relation}`;
        }
      } catch (_e) {}
    }

    return (
      <tr key={apt.id} className="hover:bg-[#F7F9FD] transition-colors">
        <td className="py-4 px-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-xs">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[#0B1F3A] block">{pName}</span>
                {relationBadge && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {relationBadge}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Token: #{apt.tokenNumber || apt.id?.slice(0, 8)}
              </span>
            </div>
          </div>
        </td>
        <td className="py-4 px-6 text-slate-600">
          <span className="font-semibold text-slate-800">
            {new Date(apt.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
          <br />
          <span className="text-[11px] text-slate-500">{apt.timeSlot} (IST)</span>
        </td>
        <td className="py-4 px-6 text-slate-600">
          <span>{apt.department || 'Cardiology Unit'}</span>
          <br />
          <span className="text-[11px] text-slate-400">{apt.mode || 'IN_PERSON'}</span>
        </td>
        <td className="py-4 px-6">
          <span className="text-[#0B1F3A] font-semibold">{apt.doctorProfile?.name || 'Dr. Kavitha Menon'}</span>
        </td>
        <td className="py-4 px-6">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E6FFFA] text-[#00A896] border border-[#02C39A]/30 text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A896]"></span>
            Approved
          </span>
        </td>
        <td className="py-4 px-6 text-right">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setSelectedSlipApt(apt)}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-[15px]">confirmation_number</span>
              OPD Slip
            </button>
            <Link to="/doctor/patient-history" className="text-xs font-semibold text-[#00A896] hover:underline">
              View Chart →
            </Link>
          </div>
        </td>
      </tr>
    );
  })
)}
</tbody>
</table>
</div>
</section>

      {/* ABDM OPD Token Slip Modal */}
      {selectedSlipApt && (
        <AppointmentSlipModal
          appointment={selectedSlipApt}
          onClose={() => setSelectedSlipApt(null)}
        />
      )}
    </div>
  );
}
