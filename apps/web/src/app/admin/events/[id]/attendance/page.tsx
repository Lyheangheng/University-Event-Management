'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  AdminAttendanceResponse,
  AdminAttendanceRecord,
  fetchAdminEventAttendance,
} from '../../../../../lib/attendance-api';
import { formatEventDate, formatTimeRange } from '../../../../../lib/formatters';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminEventAttendancePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  // Data states
  const [data, setData] = useState<AdminAttendanceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Auth token state
  const [token, setToken] = useState<string | null>(null);

  // Filter & search states
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'INCOMPLETE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected record for inspection modal
  const [selectedRecord, setSelectedRecord] = useState<AdminAttendanceRecord | null>(null);

  // Read stored token on mount & redirect if unauthenticated
  useEffect(() => {
    const storedToken = localStorage.getItem('admin_access_token');
    if (!storedToken) {
      router.replace(`/admin/login?redirect=/admin/events/${id}/attendance`);
    } else {
      setToken(storedToken);
    }
  }, [router, id]);

  // Fetch Attendance Data
  const loadAttendance = useCallback(async (authToken: string) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const resData = await fetchAdminEventAttendance(id, authToken);
      setData(resData);
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        localStorage.removeItem('admin_access_token');
        router.replace(`/admin/login?redirect=/admin/events/${id}/attendance`);
      } else if (err.message === 'EVENT_NOT_FOUND') {
        setError('EVENT_NOT_FOUND');
      } else {
        setError(err.message || 'Failed to load attendance records');
      }
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (token) {
      loadAttendance(token);
    }
  }, [token, loadAttendance]);

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    setToken(null);
    setData(null);
    router.push('/admin/login');
  };

  // Filtered records logic
  const filteredRecords = (data?.records || []).filter((record) => {
    const matchesStatus =
      statusFilter === 'ALL' || record.status === statusFilter;
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      record.studentId.toLowerCase().includes(query) ||
      record.studentName.toLowerCase().includes(query) ||
      record.faculty.toLowerCase().includes(query) ||
      record.major.toLowerCase().includes(query);

    return matchesStatus && matchesSearch;
  });

  // Helper to format proof image URL securely
  const getImageUrl = (path?: string | null) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
  };

  // Loading Skeleton
  if (loading && !data) {
    return (
      <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8 animate-pulse select-none">
        <div className="h-8 bg-slate-800/60 rounded-xl w-1/3" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-800/60 rounded-2xl" />
          <div className="h-24 bg-slate-800/60 rounded-2xl" />
          <div className="h-24 bg-slate-800/60 rounded-2xl" />
        </div>
        <div className="h-64 bg-slate-800/40 rounded-3xl" />
      </div>
    );
  }

  // Event Not Found State
  if (error === 'EVENT_NOT_FOUND') {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-6 font-sans">
        <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 text-amber-400 flex items-center justify-center mx-auto text-2xl font-bold">
          ⚠️
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-100">Event Not Found</h1>
          <p className="text-slate-400 text-sm">
            The event requested for attendance review does not exist.
          </p>
        </div>
        <Link
          href="/admin"
          className="inline-block py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
        >
          Return to Admin Dashboard
        </Link>
      </div>
    );
  }

  // Error State
  if (error || !data) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16 text-center space-y-6 font-sans">
        <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto text-2xl font-bold">
          ✕
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-100">Failed to Load Attendance</h1>
          <p className="text-slate-400 text-sm">{error || 'An unexpected error occurred.'}</p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => token && loadAttendance(token)}
            className="py-3 px-6 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-200 font-bold text-sm transition-all"
          >
            Retry
          </button>
          <Link
            href="/admin"
            className="py-3 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { event, summary } = data;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-8 sm:py-12 space-y-8 font-sans select-none">
      {/* Top Navigation & Action Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-black uppercase tracking-widest">
              ADMINISTRATOR PORTAL
            </span>
            <span className="text-xs text-slate-500">• Attendance Management</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-100 tracking-tight leading-tight">
            {event.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {event.location} • {formatEventDate(event.date)} ({formatTimeRange(event.startTime, event.endTime)})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all"
          >
            ← Admin Dashboard
          </Link>
          <Link
            href={`/events/${event.id}/display`}
            className="px-4 py-2 rounded-xl bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-bold transition-all"
          >
            Projector Display
          </Link>
          <button
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold transition-all"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            TOTAL RECORDS
          </span>
          <div className="text-3xl font-black text-slate-100">{summary.totalRecords}</div>
          <span className="text-[11px] text-slate-500">Student submissions</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-emerald-500/30 bg-emerald-500/5 space-y-1 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
            COMPLETED
          </span>
          <div className="text-3xl font-black text-emerald-300">{summary.completedCount}</div>
          <span className="text-[11px] text-emerald-500/80">Checked-in & Checked-out</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-amber-500/30 bg-amber-500/5 space-y-1 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            INCOMPLETE
          </span>
          <div className="text-3xl font-black text-amber-300">{summary.incompleteCount}</div>
          <span className="text-[11px] text-amber-500/80">Awaiting Check-Out</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1 shadow-lg">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            PARTICIPATION BREAKDOWN
          </span>
          <div className="text-sm font-bold text-slate-200 mt-2 space-y-0.5">
            <div>Check-Ins: <span className="text-indigo-400 font-mono">{summary.checkedInCount}</span></div>
            <div>Check-Outs: <span className="text-indigo-400 font-mono">{summary.checkedOutCount}</span></div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-2">
          {(['ALL', 'COMPLETED', 'INCOMPLETE'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? st === 'COMPLETED'
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : st === 'INCOMPLETE'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
                    : 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st === 'ALL' ? 'All Records' : st}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 hover:text-slate-300"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Attendance Records Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-950 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              📋
            </div>
            <h3 className="text-base font-bold text-slate-300">No attendance submissions found</h3>
            <p className="text-xs text-slate-500">
              {data.records.length === 0
                ? 'No students have submitted attendance for this event yet.'
                : 'No attendance records match the selected filter criteria.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
                  <th className="p-4 pl-6">Student ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Faculty & Major</th>
                  <th className="p-4">Year</th>
                  <th className="p-4">Check-In Time</th>
                  <th className="p-4">Check-Out Time</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 pr-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-indigo-400">{rec.studentId}</td>
                    <td className="p-4 font-bold text-slate-100">{rec.studentName}</td>
                    <td className="p-4 text-slate-400">
                      {rec.faculty} <span className="text-slate-600">({rec.major})</span>
                    </td>
                    <td className="p-4">Year {rec.year}</td>
                    <td className="p-4 font-mono text-slate-300">
                      {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString('en-GB') : '—'}
                    </td>
                    <td className="p-4 font-mono text-slate-300">
                      {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('en-GB') : '—'}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          rec.status === 'COMPLETED'
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => setSelectedRecord(rec)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600/10 hover:bg-indigo-600 border border-indigo-500/20 hover:border-indigo-500 text-indigo-300 hover:text-white font-bold text-[11px] transition-all"
                      >
                        Inspect Submission
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Inspection Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedRecord(null)}
              className="absolute top-6 right-6 w-8 h-8 rounded-full bg-slate-950 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="space-y-1 pr-8">
              <span
                className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2 ${
                  selectedRecord.status === 'COMPLETED'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                }`}
              >
                {selectedRecord.status} ATTENDANCE RECORD
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-100">
                {selectedRecord.studentName}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                Student ID: {selectedRecord.studentId} • {selectedRecord.faculty} ({selectedRecord.major}) — Year {selectedRecord.year}
              </p>
            </div>

            {/* Proof Photos Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Check-In Proof */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-emerald-400 uppercase tracking-wider">
                    Check-In Proof
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {selectedRecord.checkInTime ? new Date(selectedRecord.checkInTime).toLocaleString('en-GB') : 'N/A'}
                  </span>
                </div>

                {getImageUrl(selectedRecord.checkInProofUrl) ? (
                  <div className="w-full h-48 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(selectedRecord.checkInProofUrl)!}
                      alt="Check-in proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs">
                    <span>No proof photo uploaded</span>
                  </div>
                )}
              </div>

              {/* Check-Out Proof */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-400 uppercase tracking-wider">
                    Check-Out Proof
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">
                    {selectedRecord.checkOutTime ? new Date(selectedRecord.checkOutTime).toLocaleString('en-GB') : 'Awaiting Checkout'}
                  </span>
                </div>

                {getImageUrl(selectedRecord.checkOutProofUrl) ? (
                  <div className="w-full h-48 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getImageUrl(selectedRecord.checkOutProofUrl)!}
                      alt="Check-out proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-48 rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center text-slate-500 text-xs space-y-1">
                    <span>{selectedRecord.checkOutTime ? 'No photo file' : 'INCOMPLETE'}</span>
                    {!selectedRecord.checkOutTime && (
                      <span className="text-[10px] text-slate-600">Check-out pending</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Student Feedback */}
            {selectedRecord.feedback && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Student Recommendation / Feedback
                </span>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                  {selectedRecord.feedback}
                </p>
              </div>
            )}

            <div className="pt-2">
              <button
                onClick={() => setSelectedRecord(null)}
                className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
