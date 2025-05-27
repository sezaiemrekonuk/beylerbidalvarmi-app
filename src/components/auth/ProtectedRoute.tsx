'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isEmailVerified } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return; // Wait for auth state to load

    const isAuthPage = pathname.startsWith('/auth');

    if (!user && !isAuthPage) {
      // User not logged in and not on an auth page, redirect to login
      router.replace('/login');
      return;
    }

    if (user && !isEmailVerified && !isAuthPage) {
      // User is logged in, email not verified, and not on an auth page.
      // AuthContext now handles showing a toast for email verification.
      // This component ensures redirection to login if user tries to access protected content.
      // A toast here would be redundant with AuthContext.
      // Consider if immediate redirection is desired, or if user should see the toast first.
      // For now, if email not verified and trying to access protected content, redirect.
      // This allows AuthContext toast to be seen on other pages before navigating to protected one.
      router.replace('/login'); // Redirect to login to reinforce verification step.
      return;
    }

    // If user is logged in, email verified OR on an auth page (e.g. /login, /signup), allow access
    // This also allows a logged-in but unverified user to stay on /login page to see any messages.

  }, [user, loading, isEmailVerified, router, pathname]);

  // If loading, or if conditions for redirection are met, children might not be rendered immediately.
  // Render children only if not loading and conditions for access are met.
  // The redirection logic above handles unauthorized access.
  // If still loading, you might want to return a loader, but often layout has its own.
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen bg-background"><p className="text-muted-foreground">Yükleniyor...</p></div>; 
  }

  // If user is not authenticated and trying to access a protected route (not an auth page), 
  // they would have been redirected. If they are on an auth page, children (auth page) should render.
  // If user is authenticated but email not verified, and on a protected route, they are redirected.
  // If user is authenticated and email verified, children (protected content) should render.
  
  // Allow rendering if: 
  // 1. Auth is loading (covered by above)
  // 2. User exists AND email is verified
  // 3. User does NOT exist BUT is on an auth page (e.g. login page itself)
  // 4. User exists, email NOT verified, BUT is on an auth page
  if ( (user && isEmailVerified) || pathname.startsWith('/auth')) {
    return <>{children}</>;
  }
  
  // Fallback, in case of an unhandled state, or if redirection is in progress.
  // This also covers the case where user is logged in, email not verified, and tries to access protected page.
  // (they will be redirected by useEffect, but this prevents rendering children momentarily)
  return <div className="flex items-center justify-center min-h-screen bg-background"><p className="text-muted-foreground">Yönlendiriliyor...</p></div>;
} 