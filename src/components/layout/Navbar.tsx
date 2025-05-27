'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { LogOut, PlusCircle, User, ListChecks, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  const router = useRouter();
  const { appUser, user } = useAuth();

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

  if (!user) {
    return null; 
  }

  return (
    <header className="bg-background border-b border-border flex-shrink-0">
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-center sm:text-left">
          <Link href="/" className="block">
            <h1 className="text-3xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
              Beyler Bi Dal
            </h1>
          </Link>
          {appUser && (
            <p className="text-sm text-muted-foreground -mt-1">
              {appUser.name}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-center sm:justify-end items-center gap-2">
          <Button onClick={() => router.push('/ads/create')} variant={"default"}>
            <PlusCircle size={18} className="mr-2" /> Yeni İlan Ver
          </Button>
          <Button onClick={() => router.push('/my-activity')} variant="outline">
            <ListChecks size={18} className="mr-2" /> Hareketlerim
          </Button>
          <Button onClick={() => router.push('/chat')} variant="outline" >
            <MessageSquare size={18} className="mr-2" /> Sohbet
          </Button>
          <Button onClick={() => router.push('/profile')} variant="outline" >
            <User size={18} className="mr-2" /> Profil
          </Button>
          <Button onClick={handleLogout} variant="destructive" >
            <LogOut size={18} className="mr-2"/> Çıkış Yap
          </Button>
        </div>
      </div>
    </header>
  );
} 