'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/firebase';
import { signInWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FirebaseError } from 'firebase/app';

const formSchema = z.object({
  email: z.string().email({ message: 'Geçersiz e-posta adresi.' }),
  password: z.string().min(1, { message: 'Şifre gereklidir.' }),
});

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      if (!userCredential.user.emailVerified) {
        toast.error('E-posta Doğrulaması Gerekli', {
          description: 'Lütfen giriş yapmadan önce e-postanızı doğrulayın. Gelen kutunuzu ve spam klasörünüzü kontrol edin.',
          action: {
            label: 'Doğrulama E-postasını Tekrar Gönder',
            onClick: async () => {
                try {
                    await sendEmailVerification(userCredential.user);
                    toast.success("Doğrulama e-postası tekrar gönderildi.");
                } catch (e: unknown) {
                    if (e instanceof FirebaseError) {
                        toast.error("Doğrulama e-postası gönderilemedi.", { description: e.message });
                    } else {
                        toast.error("Doğrulama e-postası gönderilemedi.", { description: "Bilinmeyen bir hata oluştu." });
                    }
                }
            }
          },
          duration: 10000,
        });
        setLoading(false);
        return;
      }
      toast.success("Giriş başarılı! Yönlendiriliyorsunuz...");
      router.push('/'); 
    } catch (error: unknown) {
        if (error instanceof FirebaseError) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast.error('E-posta veya şifre hatalı.', { description: 'Lütfen bilgilerinizi kontrol edin ve tekrar deneyin.'});
            } else {
                toast.error('Giriş yapılırken bir hata oluştu.', { description: error.message || 'Lütfen tekrar deneyin.' });
            }
        } else {
            toast.error('Giriş yapılırken beklenmedik bir hata oluştu.', { description: 'Lütfen tekrar deneyin.' });
        }
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Giriş Yap</CardTitle>
          <CardDescription className="text-muted-foreground">
            Hesabınıza erişmek için e-posta ve şifrenizi girin.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-8 sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-posta</FormLabel>
                    <FormControl>
                      <Input placeholder="isim@universite.edu.tr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Şifre</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <div className="text-sm pt-1">
                      <Link href="/reset-password" className="font-medium text-primary hover:text-primary/90">
                        Şifrenizi mi unuttunuz?
                      </Link>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
              </Button>
            </form>
          </Form>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Hesabın yok mu?{' '}
            <Link href="/signup" className="font-semibold leading-6 text-primary hover:text-primary/90">
              Kayıt Ol
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 