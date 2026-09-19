import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "University Event Management System",
  description: "University Event Management and Attendance Verification System Foundation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
