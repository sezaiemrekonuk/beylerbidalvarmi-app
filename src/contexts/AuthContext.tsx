'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, onAuthStateChanged, signOut, sendEmailVerification } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { AppUser } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  appUser: AppUser | null;
  loading: boolean;
  isEmailVerified: boolean | null; // Can be null initially
  refreshAppUser: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const fetchAppUser = useCallback(async (firebaseUser: User | null) => {
    if (firebaseUser) {
      try {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setAppUser(userDocSnap.data() as AppUser);
        } else {
          setAppUser(null); // User document not found in Firestore
          console.warn("Firestore user document not found for UID:", firebaseUser.uid);
        }
      } catch (error) {
        console.error("Error fetching app user from Firestore:", error);
        setAppUser(null);
        toast.error("Kullanıcı Verileri Alınamadı", { description: "Hesap detaylarınız yüklenirken bir sorun oluştu." });
      }
    } else {
      setAppUser(null);
    }
  }, []);

  const refreshAppUser = useCallback(async () => {
    if (user) {
        // No toast here to avoid spamming, a silent refresh is often better
        // For critical errors, individual components can show toasts.
        await fetchAppUser(user);
    }
  }, [user, fetchAppUser]);

  const handleLogout = useCallback(async () => {
    const toastId = toast.loading("Çıkış yapılıyor...");
    try {
        await signOut(auth);
        setUser(null);
        setAppUser(null);
        setIsEmailVerified(null);
        toast.success("Başarıyla çıkış yaptınız.", { id: toastId });
        router.push('/login');
    } catch (error: any) {
        console.error("Logout error:", error);
        toast.error("Çıkış Yapılamadı", { id: toastId, description: error.message });
    }
  }, [router]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        await firebaseUser.reload(); // Refresh user state to get latest emailVerified status
        const currentEmailVerified = firebaseUser.emailVerified;
        setIsEmailVerified(currentEmailVerified);
        await fetchAppUser(firebaseUser);

        if (!currentEmailVerified) {
            const authRoutes = ['/login', '/signup', '/reset-password'];
            if (!authRoutes.includes(pathname)) {
                toast.error('E-posta Doğrulaması Gerekli', {
                    description: 'Hesabınızı kullanmaya devam etmek için lütfen e-postanızı doğrulayın. Doğrulama linki için gelen kutunuzu (ve spam klasörünü) kontrol edin.',
                    duration: 10000, // Increased duration for visibility
                    action: {
                        label: 'E-postayı Tekrar Gönder',
                        onClick: async () => {
                            try {
                                await sendEmailVerification(firebaseUser);
                                toast.success("Doğrulama e-postası gönderildi.");
                            } catch (e: any) {
                                toast.error("E-posta gönderilemedi", { description: e.message });
                            }
                        }
                    }
                });
                // Do not automatically log out here; ProtectedRoute will handle redirection
                // to /login if necessary, allowing user to see the toast.
            }
        }
      } else {
        setUser(null);
        setAppUser(null);
        setIsEmailVerified(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchAppUser, pathname, router]); // router was missing from dep array for logout inside effect scope if used differently

  return (
    <AuthContext.Provider value={{ user, appUser, loading, isEmailVerified, refreshAppUser, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 