'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { collection, addDoc, serverTimestamp, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

const adFormSchema = z.object({
  requested: z.string().min(3, { message: "Lütfen en az 3 karakter girin." }).max(100, { message: "En fazla 100 karakter girebilirsiniz." }),
  offered: z.string().min(3, { message: "Lütfen en az 3 karakter girin." }).max(200, { message: "En fazla 200 karakter girebilirsiniz." }),
  message: z.string().max(500, { message: "Mesajınız en fazla 500 karakter olabilir." }).optional(),
});

type AdFormValues = z.infer<typeof adFormSchema>;
const MAX_ACTIVE_ADS = 3;

export default function CreateAdPage() {
  const { user, appUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [canPostAd, setCanPostAd] = useState<boolean | null>(null); // null initially, true/false after check

  const form = useForm<AdFormValues>({
    resolver: zodResolver(adFormSchema),
    defaultValues: {
      requested: '',
      offered: '',
      message: '',
    },
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user || !appUser) {
      router.replace('/login');
      return;
    }

    const checkActiveAds = async () => {
        const adsRef = collection(db, 'ads');
        const q = query(adsRef, 
            where("userId", "==", user.uid),
            where("expiresAt", ">", Timestamp.now())
        );
        const querySnapshot = await getDocs(q);
        if (querySnapshot.size >= MAX_ACTIVE_ADS) {
            setCanPostAd(false);
            toast.error("Aktif İlan Sınırına Ulaşıldı", {
                description: `En fazla ${MAX_ACTIVE_ADS} aktif ilanınız olabilir. Yeni bir ilan yayınlamak için mevcut ilanlarınızdan birinin süresinin dolmasını bekleyin veya silin.`,
                duration: 8000,
            });
        } else {
            setCanPostAd(true);
        }
    };
    checkActiveAds();

  }, [user, appUser, authLoading, router]);

  async function onSubmit(data: AdFormValues) {
    if (!user || !appUser || !canPostAd) {
        if (!canPostAd && canPostAd !== null) { // Avoid toast if initial check hasn't run or already shown
             toast.error("İlan yayınlanamadı", { description: "Aktif ilan sınırına ulaştınız." });
        }
        return;
    }

    setIsSubmitting(true);
    const toastId = toast.loading("İlanınız yayınlanıyor...");

    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      await addDoc(collection(db, 'ads'), {
        userId: user.uid,
        universityDomain: appUser.universityDomain,
        ...data,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromDate(sevenDaysFromNow),
        status: 'active', 
      });
      toast.success("İlan başarıyla yayınlandı!", { id: toastId });
      router.push('/');
    } catch (error: any) {
      console.error("İlan oluşturulurken hata:", error);
      toast.error("İlan yayınlanırken bir hata oluştu.", { id: toastId, description: error.message });
    }
    setIsSubmitting(false);
  }

  if (authLoading || canPostAd === null) {
    return <div className="flex items-center justify-center min-h-screen"><p>Yükleniyor...</p></div>;
  }
  
  return (
    <div className="flex min-h-screen flex-col items-center bg-background py-8 px-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
            <Button asChild variant="outline" size="sm" className="absolute top-4 left-4 sm:left-6" onClick={(e) => { e.preventDefault(); router.back();}}>
                <Link href="#"><ChevronLeft size={16} className="mr-1"/> Geri</Link>
            </Button>
          <CardTitle className="text-3xl font-bold tracking-tight text-center pt-8 sm:pt-0">Yeni Takas İlanı Ver</CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            Aşağıdaki formu doldurarak yeni bir sigara takas ilanı oluşturun.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6 px-6 sm:px-10">
          {!canPostAd ? (
            <div className="text-center py-10">
                <h3 className="text-xl font-semibold text-destructive mb-3">İlan Yayınlayamazsınız</h3>
                <p className="text-muted-foreground mb-6">
                    Aktif ilan limitinize ({MAX_ACTIVE_ADS} ilan) ulaştınız. Yeni bir ilan yayınlamak için mevcut ilanlarınızdan birinin süresinin dolmasını veya silinmesini bekleyin.
                </p>
                <Button asChild>
                    <Link href="/my-activity">Aktif İlanlarım</Link>
                </Button>
            </div>
          ) : (
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="requested"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-base">İstediğiniz Sigara</FormLabel>
                        <FormControl>
                        <Input placeholder="Örn: Marlboro Red Uzun" {...field} />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                        Hangi sigarayı arıyorsunuz? Marka ve model belirtin.
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
                            className="resize-none min-h-[100px]"
                            {...field}
                        />
                        </FormControl>
                        <FormDescription className="text-xs text-muted-foreground">
                        Bu sigara karşılığında ne teklif ediyorsunuz? Açık olun.
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
                            placeholder="Eklemek istediğiniz bir not var mı? (Yer, zaman, iletişim tercihi vb.)"
                            className="resize-none min-h-[100px]"
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
                <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting || !canPostAd}>
                    {isSubmitting ? 'Yayınlanıyor...' : 'İlanı Yayınla'}
                </Button>
                </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 