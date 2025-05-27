'use client';

import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { db, storage, auth } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { toast } from 'sonner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form';
import { Camera } from 'lucide-react';

const phoneRegex = new RegExp(
    /^(\+90|0)?\s*?(\d{3})\s*?(\d{3})\s*?(\d{2})\s*?(\d{2})$/
);

const profileFormSchema = z.object({
    fullName: z.string().min(3, { message: 'Ad Soyad en az 3 karakter olmalıdır.' }).max(50),
    phone: z.string().regex(phoneRegex, 'Geçersiz Türkiye telefon numarası. Örn: 05xxxxxxxxx veya +905xxxxxxxxx'),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { user, appUser, loading: authLoading, refreshAppUser } = useAuth();
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(appUser?.profilePhotoUrl || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: appUser?.name || '',
      phone: appUser?.phone || '',
    },
  });

  useEffect(() => {
    if (appUser) {
      form.reset({
        fullName: appUser.name,
        phone: appUser.phone,
      });
      setPhotoPreview(appUser.profilePhotoUrl || null);
    }
  }, [appUser, form]);

  const handlePhotoChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Dosya boyutu çok büyük.", { description: "Lütfen 2MB'dan küçük bir fotoğraf seçin."});
        return;
      }
      setProfilePhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handlePhotoUpload = useCallback(async () => {
    if (!profilePhoto || !user) return;
    setIsUploading(true);
    const toastId = toast.loading("Profil fotoğrafı yükleniyor...");
    try {
      const photoName = `${Date.now()}_${profilePhoto.name}`;
      const storageRef = ref(storage, `profile_photos/${user.uid}/${photoName}`);
      await uploadBytes(storageRef, profilePhoto);
      const photoURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'users', user.uid), { profilePhotoUrl: photoURL });
      if(auth.currentUser) {
        await updateAuthProfile(auth.currentUser, { photoURL });
      }
      await refreshAppUser();
      setPhotoPreview(photoURL);
      setProfilePhoto(null);
      toast.success("Profil fotoğrafı başarıyla güncellendi.", { id: toastId });
    } catch (error: any) {
      console.error("Fotoğraf yüklenirken hata:", error);
      toast.error("Fotoğraf yüklenirken bir hata oluştu.", { id: toastId, description: error.message });
    }
    setIsUploading(false);
  }, [user, profilePhoto, refreshAppUser, setIsUploading, setPhotoPreview, setProfilePhoto, db, storage, auth]);

  useEffect(() => {
    if (profilePhoto) {
      handlePhotoUpload();
    }
  }, [profilePhoto, handlePhotoUpload]);

  async function onSubmit(values: ProfileFormValues) {
    if (!user) return;
    setIsUpdatingProfile(true);
    const toastId = toast.loading("Profil bilgileri güncelleniyor...");
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: values.fullName,
        phone: values.phone,
      });
      if (auth.currentUser) {
        await updateAuthProfile(auth.currentUser, { displayName: values.fullName });
      }
      await refreshAppUser();
      toast.success("Profil bilgileri başarıyla güncellendi.", { id: toastId });
    } catch (error: any) {
      console.error("Profil güncellenirken hata:", error);
      toast.error("Profil güncellenirken bir hata oluştu.", { id: toastId, description: error.message });
    }
    setIsUpdatingProfile(false);
  }

  if (authLoading || !appUser || !user) {
    return <div className="flex items-center justify-center min-h-screen"><p>Yükleniyor...</p></div>;
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 sm:p-6 lg:p-8 bg-background">
      <Card className="shadow-xl">
        <CardHeader className="text-center border-b border-border pb-6">
          <CardTitle className="text-3xl font-bold tracking-tight">Profil Bilgilerim</CardTitle>
          <CardDescription className="text-muted-foreground">
            Bilgilerinizi güncelleyebilir ve profil fotoğrafınızı değiştirebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8 px-6 sm:px-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
                <div className="md:col-span-1 flex flex-col items-center space-y-4">
                    <div className="relative group">
                        <Avatar className="w-32 h-32 text-4xl border-2 border-primary/20 shadow-md">
                            <AvatarImage src={photoPreview || undefined} alt={appUser.name} />
                            <AvatarFallback>{appUser.name?.charAt(0).toUpperCase() || 'K'}</AvatarFallback>
                        </Avatar>
                        <Label 
                            htmlFor="profilePhotoInput" 
                            className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full cursor-pointer"
                        >
                           <Camera size={32}/>
                        </Label>
                    </div>
                    <Input id="profilePhotoInput" type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                    <div className="text-center w-full pt-4 md:pt-0">
                        <p className="text-sm font-medium text-muted-foreground">E-posta</p>
                        <p className="text-md text-foreground break-all">{appUser.email}</p>
                        <p className="text-sm font-medium text-muted-foreground mt-2">Üniversite</p>
                        <p className="text-md text-foreground">{appUser.universityDomain}</p>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="fullName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base">Ad Soyad</FormLabel>
                                <FormControl>
                                <Input placeholder="Adınız Soyadınız" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-base">Telefon Numarası</FormLabel>
                                <FormControl>
                                <Input placeholder="05xxxxxxxxx" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isUpdatingProfile || isUploading}>
                            {isUpdatingProfile ? 'Güncelleniyor...' : 'Bilgileri Güncelle'}
                        </Button>
                        </form>
                    </Form>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
} 