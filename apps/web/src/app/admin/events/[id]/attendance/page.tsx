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
import { AdminLayout } from '../../../../../components/admin/AdminLayout';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function AuthenticatedProofImage({
  src,
  alt,
  token,
  className,
}: {
  src: string;
  alt: string;
  token: string | null;
  className?: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!src || !token) {
      setLoading(false);
      setError(true);
      return;
    }

    let isMounted = true;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(false);

    let filename = src.trim();
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }
    if (filename.includes('/')) {
      filename = filename.split('/').pop() || filename;
    }

    const targetEndpoint = `${API_BASE_URL}/api/attendance/uploads/proofs/${encodeURIComponent(filename)}`;

    fetch(targetEndpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch proof image: ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        if (isMounted) {
          createdUrl = URL.createObjectURL(blob);
          setObjectUrl(createdUrl);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error loading proof image:', err);
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [src, token]);

  if (loading) {
    return (
      <div className="w-full h-48 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 animate-pulse text-xs">
        <span>กำลังโหลดรูปภาพหลักฐาน...</span>
      </div>
    );
  }

  if (error || !objectUrl) {
    return (
      <div className="w-full h-48 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center text-slate-500 text-xs space-y-1">
        <span>ไม่สามารถโหลดรูปภาพหลักฐานได้</span>
        <span className="text-[10px] text-slate-400">ไม่มีสิทธิ์เข้าถึง หรือไม่พบไฟล์รูปภาพ</span>
      </div>
    );
  }

  return (
    <div className="w-full h-48 rounded-lg border border-slate-200 bg-white overflow-hidden flex items-center justify-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={objectUrl} alt={alt} className={className || 'w-full h-full object-cover'} />
    </div>
  );
}

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
        setError(err.message || 'ไม่สามารถโหลดข้อมูลการเข้าร่วมกิจกรรมได้');
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

  if (!token || (loading && !data)) {
    return (
      <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center p-4 text-slate-600 text-xs font-sans">
        กำลังโหลดข้อมูลการเข้าร่วมกิจกรรม...
      </div>
    );
  }

  if (error === 'EVENT_NOT_FOUND') {
    return (
      <AdminLayout title="ไม่พบกิจกรรม">
        <div className="max-w-md mx-auto p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4">
          <h1 className="text-xl font-bold text-slate-900">ไม่พบกิจกรรมที่ต้องการตรวจสอบข้อมูล</h1>
          <p className="text-xs text-slate-600">กิจกรรมนี้อาจถูกลบออกไปแล้วหรือไม่มีอยู่ในระบบ</p>
          <Link
            href="/admin"
            className="inline-block px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold"
          >
            กลับสู่แผงควบคุม
          </Link>
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout title="เกิดข้อผิดพลาด">
        <div className="max-w-md mx-auto p-8 bg-white border border-slate-200 rounded-xl text-center space-y-4">
          <h1 className="text-xl font-bold text-slate-900">ไม่สามารถโหลดข้อมูลการเข้าร่วม</h1>
          <p className="text-xs text-slate-600">{error || 'เกิดข้อผิดพลาดที่ไม่คาดคิด'}</p>
          <button
            onClick={() => token && loadAttendance(token)}
            className="px-4 py-2 rounded-lg bg-university-700 hover:bg-university-800 text-white text-xs font-semibold"
          >
            ลองอีกครั้ง
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { event, summary } = data;

  const headerActions = (
    <>
      <Link
        href="/admin"
        className="px-3.5 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors shadow-sm"
      >
        ← แผงควบคุม
      </Link>
      <Link
        href={`/admin/events/${event.id}/projector/check-in`}
        className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold transition-colors"
      >
        QR เช็กอิน
      </Link>
      <Link
        href={`/admin/events/${event.id}/projector/check-out`}
        className="px-3.5 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-semibold transition-colors"
      >
        QR เช็กเอาต์
      </Link>
    </>
  );

  return (
    <AdminLayout
      title={`ข้อมูลการเข้าร่วม: ${event.title}`}
      subtitle={`${event.location} • ${formatEventDate(event.date)} (${formatTimeRange(event.startTime, event.endTime)})`}
      actions={headerActions}
    >
      <div className="space-y-6">
        {/* Summary Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              จำนวนบันทึกทั้งหมด
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900">{summary.totalRecords}</div>
            <span className="text-[11px] text-slate-500 block">รายการที่นักศึกษาส่ง</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
              สมบูรณ์
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{summary.completedCount}</div>
            <span className="text-[11px] text-emerald-600 block">เช็กอินและเช็กเอาต์ครบถ้วน</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">
              ไม่สมบูรณ์
            </span>
            <div className="text-2xl sm:text-3xl font-bold text-amber-700">{summary.incompleteCount}</div>
            <span className="text-[11px] text-amber-600 block">รอการเช็กเอาต์</span>
          </div>

          <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
              สรุปสถิติการเข้าร่วม
            </span>
            <div className="text-xs font-semibold text-slate-700 mt-2 space-y-0.5">
              <div>ลงชื่อเช็กอิน: <span className="text-university-700 font-mono font-bold">{summary.checkedInCount}</span></div>
              <div>ลงชื่อเช็กเอาต์: <span className="text-university-700 font-mono font-bold">{summary.checkedOutCount}</span></div>
            </div>
          </div>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-2">
            {(['ALL', 'COMPLETED', 'INCOMPLETE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === st
                    ? st === 'COMPLETED'
                      ? 'bg-emerald-700 text-white'
                      : st === 'INCOMPLETE'
                      ? 'bg-amber-700 text-white'
                      : 'bg-university-700 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                {st === 'ALL' ? 'ทั้งหมด' : st === 'COMPLETED' ? 'สมบูรณ์' : 'ไม่สมบูรณ์'}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาด้วยชื่อนักศึกษา, รหัสนักศึกษา..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-university-700 focus:ring-1 focus:ring-university-700 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Attendance Records Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          {filteredRecords.length === 0 ? (
            <div className="p-10 text-center space-y-2 text-slate-600">
              <h3 className="text-sm font-bold text-slate-800">ไม่พบข้อมูลการเข้าร่วมกิจกรรม</h3>
              <p className="text-xs text-slate-500">
                {data.records.length === 0
                  ? 'ยังไม่มีนักศึกษาส่งข้อมูลการเข้าร่วมสำหรับกิจกรรมนี้'
                  : 'ไม่พบรายการข้อมูลการเข้าร่วมที่ตรงกับเงื่อนไขการค้นหา'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="p-3.5 pl-5">รหัสนักศึกษา</th>
                    <th className="p-3.5">ชื่อ - นามสกุล</th>
                    <th className="p-3.5">คณะและสาขาวิชา</th>
                    <th className="p-3.5">ชั้นปี</th>
                    <th className="p-3.5">เวลาเช็กอิน</th>
                    <th className="p-3.5">เวลาเช็กเอาต์</th>
                    <th className="p-3.5">สถานะ</th>
                    <th className="p-3.5 pr-5 text-right">การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-800">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 pl-5 font-mono font-bold text-university-800">{rec.studentId}</td>
                      <td className="p-3.5 font-bold text-slate-900">{rec.studentName}</td>
                      <td className="p-3.5 text-slate-600">
                        {rec.faculty} <span className="text-slate-400">({rec.major})</span>
                      </td>
                      <td className="p-3.5 text-slate-700">ชั้นปีที่ {rec.year}</td>
                      <td className="p-3.5 font-mono text-slate-700">
                        {rec.checkInTime ? new Date(rec.checkInTime).toLocaleTimeString('th-TH') : '—'}
                      </td>
                      <td className="p-3.5 font-mono text-slate-700">
                        {rec.checkOutTime ? new Date(rec.checkOutTime).toLocaleTimeString('th-TH') : '—'}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md text-[11px] font-semibold ${
                            rec.status === 'COMPLETED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {rec.status === 'COMPLETED' ? 'สมบูรณ์' : 'ไม่สมบูรณ์'}
                        </span>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <button
                          onClick={() => setSelectedRecord(rec)}
                          className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-semibold text-xs shadow-sm transition-colors"
                        >
                          ตรวจสอบหลักฐาน
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Submission Proof Inspection Modal */}
        {selectedRecord && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto font-sans select-none">
            <div className="max-w-2xl w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6 shadow-xl relative my-8">
              <button
                onClick={() => setSelectedRecord(null)}
                className="absolute top-5 right-5 w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 flex items-center justify-center text-xs"
              >
                ✕
              </button>

              {/* Modal Header */}
              <div className="space-y-1 pr-6 border-b border-slate-200 pb-4">
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-semibold mb-1 ${
                    selectedRecord.status === 'COMPLETED'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}
                >
                  {selectedRecord.status === 'COMPLETED' ? 'บันทึกการเข้าร่วมสมบูรณ์' : 'บันทึกการเข้าร่วมไม่สมบูรณ์'}
                </span>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedRecord.studentName}
                </h2>
                <p className="text-xs text-slate-600 font-mono">
                  รหัสนักศึกษา: {selectedRecord.studentId} • {selectedRecord.faculty} ({selectedRecord.major}) — ชั้นปีที่ {selectedRecord.year}
                </p>
              </div>

              {/* Proof Photos Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Check-In Proof */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                    <span className="font-bold text-emerald-800 uppercase tracking-wider">
                      หลักฐานการเช็กอิน
                    </span>
                    <span className="font-mono text-slate-600 text-[11px]">
                      {selectedRecord.checkInTime ? new Date(selectedRecord.checkInTime).toLocaleString('th-TH') : 'ไม่มีข้อมูล'}
                    </span>
                  </div>

                  {selectedRecord.checkInProofUrl ? (
                    <AuthenticatedProofImage
                      src={selectedRecord.checkInProofUrl}
                      alt="หลักฐานการเช็กอิน"
                      token={token}
                    />
                  ) : (
                    <div className="w-full h-48 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 text-xs">
                      <span>ไม่ได้อัปโหลดรูปภาพหลักฐาน</span>
                    </div>
                  )}
                </div>

                {/* Check-Out Proof */}
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                    <span className="font-bold text-amber-800 uppercase tracking-wider">
                      หลักฐานการเช็กเอาต์
                    </span>
                    <span className="font-mono text-slate-600 text-[11px]">
                      {selectedRecord.checkOutTime ? new Date(selectedRecord.checkOutTime).toLocaleString('th-TH') : 'รอการเช็กเอาต์'}
                    </span>
                  </div>

                  {selectedRecord.checkOutProofUrl ? (
                    <AuthenticatedProofImage
                      src={selectedRecord.checkOutProofUrl}
                      alt="หลักฐานการเช็กเอาต์"
                      token={token}
                    />
                  ) : (
                    <div className="w-full h-48 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center text-slate-500 text-xs space-y-1">
                      <span>{selectedRecord.checkOutTime ? 'ไม่มีไฟล์รูปภาพ' : 'ไม่สมบูรณ์'}</span>
                      {!selectedRecord.checkOutTime && (
                        <span className="text-[10px] text-slate-400">อยู่ระหว่างรอเช็กเอาต์</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Student Feedback */}
              {selectedRecord.feedback && (
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-xs font-semibold text-slate-700 block uppercase tracking-wider">
                    ข้อเสนอแนะ / ข้อคิดเห็นจากนักศึกษา
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                    {selectedRecord.feedback}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => setSelectedRecord(null)}
                  className="w-full py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                >
                  ปิดหน้าต่างตรวจสอบ
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
