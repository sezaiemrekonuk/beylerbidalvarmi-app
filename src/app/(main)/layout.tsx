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
      <Navbar />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">{children}</main>
    </ProtectedRoute>
  );
} 