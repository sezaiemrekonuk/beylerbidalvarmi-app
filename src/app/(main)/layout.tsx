'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import React from 'react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      <div className="overflow-hidden flex flex-col">
        <Navbar />
        <main className="flex-grow overflow-hidden container mx-auto p-4 sm:p-6 lg:p-8 w-full flex flex-col">
          {/* The children (e.g., ChatPage) will need to be h-full to fill this main area */}
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
} 