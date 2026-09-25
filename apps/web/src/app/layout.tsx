import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "../components/Navbar";

export const metadata: Metadata = {
  title: "ระบบกิจกรรมมหาวิทยาลัย | University Event Management",
  description: "ระบบบริหารจัดการกิจกรรม และระบบบันทึกการเข้าร่วมของนักศึกษา",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="antialiased min-h-screen bg-[#F7F7F5] text-[#1F2933] flex flex-col selection:bg-university-700 selection:text-white font-sans">
        <Navbar />
        <main className="flex-1 w-full flex flex-col">{children}</main>
        <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} ระบบกิจกรรมมหาวิทยาลัย (University Event Management System)</span>
            <span>ระบบพัฒนาสำหรับนักศึกษาและบุคลากรมหาวิทยาลัย</span>
          </div>
        </footer>
      </body>
    </html>
  );
}


