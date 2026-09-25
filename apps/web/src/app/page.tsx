import React from "react";
import Link from "next/link";

export default function Home() {
  return (
    <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col items-center justify-center text-center px-4 py-10 sm:py-16 font-sans">
      {/* Main Container Surface */}
      <div className="w-full bg-white border border-slate-200 rounded-xl p-6 sm:p-12 shadow-sm space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-university-50 border border-university-200 text-university-800 text-xs font-medium">
          <span className="w-2 h-2 rounded-full bg-university-700" />
          ระบบบริหารจัดการกิจกรรมนักศึกษา มหาวิทยาลัย
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl sm:text-4xl font-bold text-slate-900 tracking-tight leading-snug">
            ศูนย์รวมกิจกรรมมหาวิทยาลัย และระบบลงชื่อเข้าร่วมกิจกรรม
          </h1>
          <p className="text-slate-600 text-xs sm:text-base leading-relaxed max-w-2xl mx-auto">
            เข้าชมรายการกิจกรรมของมหาวิทยาลัย ติดตามสถานะกิจกรรม สแกน QR Code เพื่อลงชื่อเช็กอินและเช็กเอาต์เข้าร่วมกิจกรรมอย่างสะดวกรวดเร็ว
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/events"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-university-700 hover:bg-university-800 text-white font-medium text-sm transition-colors shadow-sm"
          >
            ดูรายการกิจกรรมมหาวิทยาลัย
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-200 text-xs text-slate-600">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-1">
            <span className="block font-semibold text-slate-900 text-sm">เรียกดูกิจกรรม</span>
            <span className="text-slate-600">ตรวจสอบรายละเอียดกิจกรรมที่กำลังจะมาถึง ดำเนินอยู่ และสิ้นสุดแล้ว</span>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-1">
            <span className="block font-semibold text-slate-900 text-sm">QR เช็กอิน / เช็กเอาต์</span>
            <span className="text-slate-600">สแกน QR Code บนหน้าจอสถานที่จัดงานเพื่อลงชื่อเข้าร่วม</span>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-left space-y-1">
            <span className="block font-semibold text-slate-900 text-sm">ยืนยันตัวตนผ่าน LINE</span>
            <span className="text-slate-600">เชื่อมต่อบัญชีนักศึกษากับ LINE เพื่อรับการแจ้งเตือนกิจกรรม</span>
          </div>
        </div>
      </div>
    </div>
  );
}

