'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { LogOut, PlusCircle, User, ListChecks, MessageSquare } from 'lucide-react';

export default function Navbar() {
  const router = useRouter();
  const { appUser, user } = useAuth(); // Assuming useAuth provides appUser and firebase user

  const handleLogout = async () => {
    const toastId = toast.loading("Çıkış yapılıyor...");
    try {
      await signOut(auth);
      toast.success("Başarıyla çıkış yapıldı.", { id: toastId });
      router.push('/login');
    } catch (error: any) {
      console.error('Çıkış yapılırken hata: ', error);
      toast.error("Çıkış Yapılamadı", { id: toastId, description: error.message });
    }
  };

  // Prevent rendering navbar if user is not available, can be adjusted based on app logic
  if (!appUser || !user) {
    return null; 
  }

  return (
    <header className="bg-background border-b border-border">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Hoş Geldin, {appUser.name}!</h1>
          <p className="text-md text-muted-foreground">Üniversite: {appUser.universityDomain}</p>
        </div>
        <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
          <Button onClick={() => router.push('/ads/create')} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusCircle size={18} className="mr-2" /> Yeni İlan Ver
          </Button>
          <Button onClick={() => router.push('/my-activity')} variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">
            <ListChecks size={18} className="mr-2" /> Hareketlerim
          </Button>
          <Button onClick={() => router.push('/chat')} variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">
            <MessageSquare size={18} className="mr-2" /> Sohbet
          </Button>
          <Button onClick={() => router.push('/profile')} variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">
            <User size={18} className="mr-2" /> Profil
          </Button>
          <Button onClick={handleLogout} variant="destructive" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            <LogOut size={18} className="mr-2"/> Çıkış Yap
          </Button>
        </div>
      </div>
    </header>
  );
} 