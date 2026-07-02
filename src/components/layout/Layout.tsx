import type { ReactNode } from 'react';
import { Navbar } from './Navbar';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen bg-pitch-950">
      <div className="pointer-events-none fixed inset-0 bg-stadium-glow" />
      <div className="pointer-events-none fixed inset-0 bg-pitch-lines opacity-40" />
      <div className="relative z-10">
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </div>
    </div>
  );
}
