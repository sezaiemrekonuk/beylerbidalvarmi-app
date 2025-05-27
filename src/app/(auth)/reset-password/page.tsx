'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const resetPasswordSchema = z.object({
  email: z.string().email({ message: "Geçerli bir e-posta adresi giriniz." }),
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ResetPasswordFormValues) => {
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, data.email);
      toast.success('Şifre sıfırlama e-postası gönderildi.', {
        description: 'Lütfen gelen kutunuzu ve spam klasörünüzü kontrol edin.',
      });
      form.reset(); 
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        toast.error('Kullanıcı bulunamadı.', { description: 'Bu e-posta adresi ile kayıtlı bir kullanıcı bulunamadı.'});
      } else {
        toast.error('Şifre sıfırlama e-postası gönderilemedi.', { description: err.message || 'Lütfen tekrar deneyin.'});
      }
      console.error("Şifre sıfırlama hatası:", err);
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Şifre Sıfırla</CardTitle>
          <CardDescription className="text-muted-foreground">
            Şifrenizi sıfırlamak için kayıtlı e-posta adresinizi girin.
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
                    <FormLabel>E-posta Adresi</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="ornek@posta.edu.tr" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama E-postası Gönder'}
              </Button>
            </form>
          </Form>
          <div className="mt-8 text-center">
            <Link href="/login" className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/90">
                <ChevronLeft size={16} className="mr-1" />
                Giriş ekranına geri dön
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 