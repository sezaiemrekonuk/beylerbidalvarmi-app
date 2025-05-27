'use client';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import React from 'react';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute>
      {/* TODO: Add Navbar and Footer here later */}
      <main>{children}</main>
    </ProtectedRoute>
  );
} 