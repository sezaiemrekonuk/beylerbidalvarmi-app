'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
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
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FirebaseError } from 'firebase/app';

const phoneRegex = new RegExp(
  /^(\+90|0)?\s*?(\d{3})\s*?(\d{3})\s*?(\d{2})\s*?(\d{2})$/
);

const formSchema = z.object({
  fullName: z.string().min(3, { message: 'Ad Soyad en az 3 karakter olmalıdır.' }).max(50),
  email: z
    .string()
    .email({ message: 'Geçersiz e-posta adresi.' })
    .refine((email) => email.endsWith('.edu.tr'), {
      message: 'Sadece .edu.tr uzantılı e-posta adresleri kabul edilmektedir.',
    }),
  phone: z.string().regex(phoneRegex, 'Geçersiz Türkiye telefon numarası. Örn: 05xxxxxxxxx veya +905xxxxxxxxx'),
  password: z.string().min(6, { message: 'Şifre en az 6 karakter olmalıdır.' }),
});

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  // Removed local error state, will use toast for errors

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      await updateProfile(userCredential.user, { displayName: values.fullName });
      await sendEmailVerification(userCredential.user);

      const universityDomain = values.email.substring(values.email.lastIndexOf('@') + 1);

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: values.fullName,
        email: values.email,
        phone: values.phone,
        universityDomain: universityDomain,
        profilePhotoUrl: null,
        createdAt: serverTimestamp(),
      });

      toast.success('Kayıt başarılı! Giriş yapabilirsiniz.', {
        description: 'E-posta adresinize bir doğrulama bağlantısı gönderildi. Lütfen e-postanızı kontrol edin ve hesabınızı doğrulayın.',
        duration: 8000, // Keep it a bit longer for user to read
      });
      
      router.push('/login');
    } catch (error: unknown) {
      console.error("Kayıt sırasında hata:", error);
      if (error instanceof FirebaseError) {
        if (error.code === 'auth/email-already-in-use') {
          toast.error('Bu e-posta adresi zaten kayıtlı.');
        } else {
          toast.error('Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.', {
              description: error.message
          });
        }
      } else {
        toast.error('Kayıt sırasında beklenmedik bir hata oluştu. Lütfen tekrar deneyin.');
      }
    }
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold tracking-tight">Yeni Hesap Oluştur</CardTitle>
          <CardDescription className="text-muted-foreground">
            Takas dünyasına katılmak için bilgilerinizi girin.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 py-8 sm:px-10">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ad Soyad</FormLabel>
                    <FormControl>
                      <Input placeholder="Adınız Soyadınız" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Üniversite E-postası</FormLabel>
                    <FormControl>
                      <Input placeholder="isim@universite.edu.tr" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs text-muted-foreground">
                      Sadece .edu.tr uzantılı e-posta adresleri kabul edilir.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefon Numarası</FormLabel>
                    <FormControl>
                      <Input placeholder="05xxxxxxxxx" {...field} />
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
                    <FormDescription className="text-xs text-muted-foreground">
                      Şifreniz en az 6 karakter olmalıdır.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading}>
                {loading ? 'Hesap Oluşturuluyor...' : 'Hesap Oluştur'}
              </Button>
            </form>
          </Form>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Zaten bir hesabın var mı?{' '}
            <Link href="/login" className="font-semibold leading-6 text-primary hover:text-primary/90">
              Giriş Yap
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 