'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Do not render top Navbar on projector display pages
  if (pathname?.includes('/projector') || pathname?.includes('/display')) {
    return null;
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path);

  return (
    <nav className="w-full bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-university-700 text-white flex items-center justify-center font-bold shadow-sm transition-colors group-hover:bg-university-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight block">
                ระบบกิจกรรมนักศึกษา
              </span>
              <span className="text-[11px] text-slate-500 font-normal block -mt-0.5">
                มหาวิทยาลัย
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/events"
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                isActive('/events')
                  ? 'bg-university-50 text-university-800 border border-university-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              รายการกิจกรรม
            </Link>

            <Link
              href="/"
              className={`px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
                pathname === '/'
                  ? 'bg-university-50 text-university-800 border border-university-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              หน้าแรก
            </Link>
          </div>

          {/* Right Header Status */}
          <div className="hidden md:flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              ระบบพร้อมใช้งาน
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="เมนูหลัก"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-2">
          <Link
            href="/events"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2 rounded-lg text-sm font-semibold ${
              isActive('/events') ? 'bg-university-50 text-university-800 border border-university-200' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            รายการกิจกรรม
          </Link>

          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3.5 py-2 rounded-lg text-sm font-semibold ${
              pathname === '/' ? 'bg-university-50 text-university-800 border border-university-200' : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            หน้าแรก
          </Link>

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 px-1">
            <span>สถานะระบบ</span>
            <span className="text-emerald-700 font-medium">● เปิดใช้งานปกติ</span>
          </div>
        </div>
      )}
    </nav>
  );
}

