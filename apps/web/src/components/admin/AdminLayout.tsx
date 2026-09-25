'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminLayout({ children, title, subtitle, actions }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('admin_access_token');
    router.push('/admin/login');
  };

  const navItems = [
    {
      label: 'แดชบอร์ด & กิจกรรม',
      href: '/admin',
      active: pathname === '/admin' || pathname === '/admin/events',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
    },
    {
      label: 'สร้างกิจกรรมใหม่',
      href: '/admin/events/new',
      active: pathname === '/admin/events/new',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
    },
    {
      label: 'หน้าหลักพอร์ตัลนักศึกษา',
      href: '/events',
      active: false,
      external: true,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col md:flex-row font-sans text-slate-900 select-none">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-university-700 text-white flex items-center justify-center font-bold text-xs">
            มธ
          </div>
          <div>
            <span className="font-bold text-slate-900 text-xs block leading-tight">ระบบผู้ดูแลระบบ</span>
            <span className="text-[10px] text-slate-500 block">มหาวิทยาลัย</span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          aria-label="เมนูระบบ"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                item.active
                  ? 'bg-university-50 text-university-800 border border-university-200'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className={item.active ? 'text-university-700' : 'text-slate-500'}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}

          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>ออกจากระบบ</span>
            </button>
          </div>
        </div>
      )}

      {/* Persistent Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen">
        {/* Sidebar Brand Header */}
        <div className="p-5 border-b border-slate-200">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-university-700 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0H9" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block leading-tight">
                ศูนย์จัดการกิจกรรม
              </span>
              <span className="text-[11px] text-slate-500 font-normal block">
                ระบบผู้ดูแลระบบมหาวิทยาลัย
              </span>
            </div>
          </Link>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1">
            เมนูหลัก
          </div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                item.active
                  ? 'bg-university-50 text-university-800 border border-university-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className={item.active ? 'text-university-700' : 'text-slate-500'}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Sidebar User / Logout Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-7 h-7 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
              ผู้ดูแล
            </div>
            <div className="truncate">
              <span className="text-xs font-bold text-slate-800 block truncate">Administrator</span>
              <span className="text-[10px] text-slate-500 block truncate">สิทธิ์เข้าถึงเต็มรูปแบบ</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:text-red-700 text-xs font-semibold transition-colors shadow-sm"
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Optional Page Top Header Bar */}
        {(title || actions) && (
          <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              {title && <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>}
              {subtitle && <p className="text-xs sm:text-sm text-slate-600 mt-0.5">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
          </header>
        )}

        {/* Content Body */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
