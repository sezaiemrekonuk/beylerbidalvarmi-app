'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { Ad } from '@/lib/types';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { FirebaseError } from 'firebase/app';

const adFormSchema = z.object({
  requested: z.string().min(3, { message: "Lütfen en az 3 karakter girin." }).max(100, { message: "En fazla 100 karakter girebilirsiniz." }),
  offered: z.string().min(3, { message: "Lütfen en az 3 karakter girin." }).max(200, { message: "En fazla 200 karakter girebilirsiniz." }),
  message: z.string().max(500, { message: "Mesajınız en fazla 500 karakter olabilir." }).optional(),
});

type AdFormValues = z.infer<typeof adFormSchema>;

export default function EditAdPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const adId = params.adId as string;

  const [ad, setAd] = useState<Ad | null>(null);
  const [isLoadingAd, setIsLoadingAd] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const form = useForm<AdFormValues>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      requested: '',
      offered: '',
      message: '',
    },
  });

  useEffect(() => {
    if (!adId || authLoading) return;
    if (!user) {
        router.replace('/login');
        return;
    }

    const fetchAd = async () => {
      setIsLoadingAd(true);
      setPageError(null);
      try {
        const adDocRef = doc(db, 'ads', adId);
        const adDocSnap = await getDoc(adDocRef);

        if (adDocSnap.exists()) {
          const adData = adDocSnap.data() as Ad;
          if (adData.userId !== user.uid) {
            setPageError("Bu ilanı düzenleme yetkiniz yok.");
            toast.error("Yetkisiz Erişim", { description: "Bu ilanı düzenleme yetkiniz bulunmamaktadır." });
            setAd(null);
          } else if (adData.expiresAt instanceof Timestamp && adData.expiresAt.toDate() < new Date()) {
            setPageError("Süresi dolmuş bir ilanı düzenleyemezsiniz.");
            toast.error("İlan Süresi Dolmuş", { description: "Süresi dolmuş bir ilanı düzenleyemezsiniz." });
            setAd(null);
          } else {
            setAd(adData);
            form.reset({
              requested: adData.requested,
              offered: adData.offered,
              message: adData.message || '',
            });
          }
        } else {
          setPageError("İlan bulunamadı.");
          toast.error("İlan Bulunamadı", { description: `ID: ${adId} olan ilan bulunamadı.`});
          setAd(null);
        }
      } catch (err: unknown) {
        console.error("İlan getirilirken hata:", err);
        setPageError("İlan bilgileri getirilirken bir hata oluştu.");
        if (err instanceof FirebaseError) {
            toast.error("Veri Çekme Hatası", { description: err.message || "İlan bilgileri getirilirken bir sorun oluştu." });
        } else if (err instanceof Error) {
            toast.error("Veri Çekme Hatası", { description: err.message || "İlan bilgileri getirilirken bir sorun oluştu." });
        } else {
            toast.error("Veri Çekme Hatası", { description: "İlan bilgileri getirilirken bilinmeyen bir sorun oluştu." });
        }
        setAd(null);
      }
      setIsLoadingAd(false);
    };

    fetchAd();
  }, [adId, user, authLoading, router, form]);

  const onSubmit = async (data: AdFormValues) => {
    if (!ad || !user || ad.userId !== user.uid) {
      toast.error("Güncelleme Başarısız", { description: "Bu ilanı güncelleme yetkiniz yok veya ilan bulunamadı."});
      return;
    }
    if (ad.expiresAt instanceof Timestamp && ad.expiresAt.toDate() < new Date()) {
        toast.error("Güncelleme Başarısız", { description: "Süresi dolmuş bir ilanı güncelleyemezsiniz."} );
        return;
    }

    setIsUpdating(true);
    const toastId = toast.loading("İlan güncelleniyor...");
    try {
      const adDocRef = doc(db, 'ads', adId);
      await updateDoc(adDocRef, {
        ...data, 
        updatedAt: serverTimestamp(),
      });
      toast.success("İlan başarıyla güncellendi!", { id: toastId });
      router.push('/'); 
    } catch (err: unknown) {
      console.error("İlan güncellenirken hata:", err);
      if (err instanceof FirebaseError) {
        toast.error("Güncelleme Hatası", { id: toastId, description: err.message || "İlan güncellenirken bir hata oluştu." });
      } else if (err instanceof Error) {
        toast.error("Güncelleme Hatası", { id: toastId, description: err.message || "İlan güncellenirken bir hata oluştu." });
      } else {
        toast.error("Güncelleme Hatası", { id: toastId, description: "İlan güncellenirken bilinmeyen bir hata oluştu." });
      }
    }
    setIsUpdating(false);
  };

  if (authLoading || isLoadingAd) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
             <p className="text-muted-foreground">İlan yükleniyor...</p>
        </div>
    );
  }

  if (pageError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6 text-center shadow-xl">
            <CardTitle className="text-2xl font-bold text-destructive mb-4">Bir Sorun Oluştu</CardTitle>
            <CardDescription className="text-muted-foreground mb-6">{pageError}</CardDescription>
            <Button asChild className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/">Ana Sayfaya Dön</Link>
            </Button>
        </Card>
      </div>
    );
  }

  if (!ad) {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
             <p className="text-muted-foreground mb-4">İlan bulunamadı veya erişim yetkiniz yok.</p>
             <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/">Ana Sayfaya Dön</Link>
            </Button>
        </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-background py-8 px-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <Button variant="outline" size="sm" className="absolute top-4 left-4 sm:left-6 border-border hover:bg-accent hover:text-accent-foreground" onClick={() => router.back()}>
            <ChevronLeft size={16} className="mr-1"/> Geri
          </Button>
          <CardTitle className="text-3xl font-bold tracking-tight text-center pt-8 sm:pt-0">İlanı Düzenle</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            İlanınızın detaylarını aşağıdan güncelleyebilirsiniz.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 px-6 sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="requested"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">İstediğiniz Sigara</FormLabel>
                    <FormControl>
                      <Input className="bg-input text-foreground border-border placeholder:text-muted-foreground" placeholder="Örn: Marlboro Red Uzun" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      Hangi sigarayı arıyorsunuz?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="offered"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Karşılığında Teklifiniz</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Örn: İki dal Parliament Night Blue veya bir paket Kent Switch"
                        className="resize-none min-h-[100px] bg-input text-foreground border-border placeholder:text-muted-foreground"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      Bu sigara karşılığında ne teklif ediyorsunuz?
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base">Ek Mesaj (İsteğe Bağlı)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Eklemek istediğiniz bir not var mı? (Yer, zaman vb.)"
                        className="resize-none min-h-[100px] bg-input text-foreground border-border placeholder:text-muted-foreground"
                        {...field}
                      />
                    </FormControl>
                     <FormDescription className="text-xs text-muted-foreground">
                      İlanınıza eklemek istediğiniz özel bir notunuz varsa buraya yazabilirsiniz.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isUpdating || isLoadingAd}>
                {isUpdating ? 'Güncelleniyor...' : 'İlanı Güncelle'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 