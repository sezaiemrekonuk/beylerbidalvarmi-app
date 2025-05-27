'use client';

import { Button } from '@/components/ui/button';
import { auth, db } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState, useMemo, useCallback } from 'react';
import AdCard from '@/components/ads/AdCard';
import { Ad, AppUser as FirestoreAppUser, AdResponse, Report as FirestoreReport } from '@/lib/types'; 
import { collection, query, where, orderBy, getDocs, Timestamp, addDoc, serverTimestamp, doc, getDoc, FieldValue, deleteDoc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { toast } from 'sonner';
import { LogOut, PlusCircle, User, ListChecks, MessageSquarePlus, Flag } from 'lucide-react';
import { fetchAdUserDetailsWithCache } from '@/lib/userCache';
import { sendAdResponseMessageEmail } from '@/lib/email';

interface AdResponsePayload {
    responderId: string;
    adOwnerId: string;
    adId: string;
    message: string;
    createdAt: ReturnType<typeof serverTimestamp>;
}

interface ReportPayload {
    reporterId: string;
    reportedUserId: string;
    adId?: string;
    reason: string;
    createdAt: ReturnType<typeof serverTimestamp>;
}

export default function HomePage() {
  const { user, appUser, loading: authLoading, isEmailVerified } = useAuth();
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [isLoadingAds, setIsLoadingAds] = useState(true);
  const [errorAds, setErrorAds] = useState<string | null>(null);
  
  const [showRespondDialog, setShowRespondDialog] = useState(false);
  const [respondingToAdId, setRespondingToAdId] = useState<string | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [isSubmittingResponse, setIsSubmittingResponse] = useState(false);
  const [responseError, setResponseError] = useState<string | null>(null);
  const [responseSuccess, setResponseSuccess] = useState<string | null>(null);

  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportingAdId, setReportingAdId] = useState<string | null>(null);
  const [reportingUserId, setReportingUserId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [adToDeleteId, setAdToDeleteId] = useState<string | null>(null);
  const [isDeletingAd, setIsDeletingAd] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
    if (!authLoading && user && !isEmailVerified) {
      alert("Devam etmek için lütfen e-postanızı doğrulayın.");
      handleLogout();
    }
  }, [user, authLoading, isEmailVerified, router, handleLogout]);

  useEffect(() => {
    const loadAds = async () => {
      if (user && appUser && isEmailVerified) {
        setIsLoadingAds(true);
        try {
          const response = await fetch('/api/ads');
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch ads from API');
          }
          let adsData: Ad[] = await response.json();
          adsData = adsData.map(ad => ({
            ...ad,
            createdAt: ad.createdAt instanceof Timestamp ? ad.createdAt : new Timestamp((ad.createdAt as any).seconds, (ad.createdAt as any).nanoseconds),
            expiresAt: ad.expiresAt instanceof Timestamp ? ad.expiresAt : new Timestamp((ad.expiresAt as any).seconds, (ad.expiresAt as any).nanoseconds),
          }));
          setAds(adsData);
        } catch (error: any) { 
          console.error("İlanlar çekilirken hata (API call): ", error);
          toast.error("İlanlar Yüklenemedi", { description: "İlanlar getirilirken bir sorun oluştu. Lütfen sayfayı yenileyin." });
        }
        setIsLoadingAds(false);
      }
    };
    loadAds();
  }, [user, appUser, isEmailVerified]);

  const sortedAds = useMemo(() => {
    if (!appUser) return ads;
    return [...ads].sort((a, b) => {
      const currentUserDomain = appUser.universityDomain?.toLowerCase();
      const aDomain = a.universityDomain?.toLowerCase();
      const bDomain = b.universityDomain?.toLowerCase();

      if (aDomain === currentUserDomain && bDomain !== currentUserDomain) return -1;
      if (aDomain !== currentUserDomain && bDomain === currentUserDomain) return 1;
      return b.createdAt.toMillis() - a.createdAt.toMillis(); 
    });
  }, [ads, appUser]);

  const handleOpenRespondDialog = (adId: string) => {
    setRespondingToAdId(adId);
    setResponseMessage('');
    setResponseError(null);
    setShowRespondDialog(true);
  };

  const handleSubmitResponse = async () => {
    if (!user || !respondingToAdId || !responseMessage.trim()) {
      toast.warning('Mesajınız boş olamaz.');
      return;
    }
    setIsSubmittingResponse(true);
    const toastId = toast.loading("Yanıtınız gönderiliyor...");
    try {
      const adRef = doc(db, "ads", respondingToAdId);
      const adSnap = await getDoc(adRef);
      if (!adSnap.exists()){
        toast.error("İlan Bulunamadı", {description: "Yanıt vermeye çalıştığınız ilan artık mevcut değil.", id: toastId});
        setShowRespondDialog(false);
        (async () => {
          setIsLoadingAds(true);
          const response = await fetch('/api/ads');
          if (response.ok) {
            let newAdsData: Ad[] = await response.json();
            newAdsData = newAdsData.map(ad => ({
                ...ad,
                createdAt: ad.createdAt instanceof Timestamp ? ad.createdAt : new Timestamp((ad.createdAt as any).seconds, (ad.createdAt as any).nanoseconds),
                expiresAt: ad.expiresAt instanceof Timestamp ? ad.expiresAt : new Timestamp((ad.expiresAt as any).seconds, (ad.expiresAt as any).nanoseconds),
            }));
            setAds(newAdsData);
          } else {
            toast.error("İlan listesi güncellenemedi.");
          }
          setIsLoadingAds(false);
        })();
        return;
      }
      const adData = adSnap.data() as Ad;
      if (adData.userId === user.uid) {
        toast.error("Kendi İlanınıza Yanıt Veremezsiniz", {id: toastId});
        setIsSubmittingResponse(false);
        return;
      }

      const responsePayload: AdResponsePayload = {
        responderId: user.uid,
        adOwnerId: adData.userId,
        adId: respondingToAdId,
        message: responseMessage,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'responses'), responsePayload);
      toast.success("Yanıtınız başarıyla gönderildi!", { id: toastId });

      // Send email notification
      if (appUser) { // appUser is the responder
        try {
          const adOwnerDetails = await fetchAdUserDetailsWithCache(adData.userId);
          if (adOwnerDetails && adOwnerDetails.email) { // Ensure owner details and email exist
            sendAdResponseMessageEmail({
              adOwnerEmail: adOwnerDetails.email,
              adOwnerName: adOwnerDetails.name,
              responderName: appUser.name, // Current logged-in user is the responder
              adDetails: { requested: adData.requested, id: adData.id },
              responseMessage: responseMessage,
            }); // We are not awaiting this, let it happen in background
          } else {
            console.warn("Ad owner details or email not found, skipping email notification.");
          }
        } catch (emailError) {
          console.error("Failed to prepare or send ad response email:", emailError);
          // Optionally, add a toast here if you want to inform user about email sending failure, but usually silent is fine
        }
      }

      setShowRespondDialog(false);
      setResponseMessage('');
    } catch (error: any) {
      console.error("Yanıt gönderilirken hata:", error);
      toast.error("Yanıt Gönderilemedi", { id: toastId, description: error.message || 'Bilinmeyen bir hata oluştu.' });
    } finally {
      setIsSubmittingResponse(false);
    }
  };

  const handleOpenReportDialog = (adId: string | null, reportedUserIdValue: string) => {
    setReportingAdId(adId);
    setReportingUserId(reportedUserIdValue);
    setReportReason('');
    setShowReportDialog(true);
  };

  const handleSubmitReport = async () => {
    if (!user || !reportingUserId || !reportReason) {
      toast.warning('Rapor nedeni seçmelisiniz.');
      return;
    }
    setIsSubmittingReport(true);
    const toastId = toast.loading("Raporunuz gönderiliyor...");
    try {
      const reportPayload: ReportPayload = {
        reporterId: user.uid,
        reportedUserId: reportingUserId,
        reason: reportReason,
        createdAt: serverTimestamp(),
      };
      if (reportingAdId) {
        reportPayload.adId = reportingAdId;
      }
      await addDoc(collection(db, 'reports'), reportPayload);
      toast.success("Raporunuz İncelenmek Üzere Gönderildi", { 
        id: toastId, 
        description: "Topluluğumuzu güvende tutmaya yardımcı olduğunuz için teşekkürler."
      });
      setShowReportDialog(false);
      setReportReason(''); // Reset reason
    } catch (error: any) {
      console.error("Rapor gönderilirken hata:", error);
      toast.error("Rapor Gönderilemedi", { id: toastId, description: error.message || 'Bilinmeyen bir hata oluştu.' });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleOpenDeleteDialog = (adId: string) => {
    setAdToDeleteId(adId);
    setIsDeleteAlertOpen(true);
    setDeleteError(null);
  };

  const handleConfirmDeleteAd = async () => {
    if (!adToDeleteId) return;
    setIsDeletingAd(true);
    const toastId = toast.loading("İlan siliniyor...");
    try {
      await deleteDoc(doc(db, "ads", adToDeleteId));
      toast.success("İlan başarıyla silindi.", { id: toastId });
      setAds(prevAds => prevAds.filter(ad => ad.id !== adToDeleteId));
      setIsDeleteAlertOpen(false);
      setAdToDeleteId(null);
    } catch (err: any) {
      console.error("İlan silinirken hata:", err);
      toast.error("Silme Başarısız", { id: toastId, description: err.message || "İlan silinirken bir hata oluştu." });
    }
    setIsDeletingAd(false);
  };

  const handleEditAd = (adId: string) => {
    router.push(`/ads/edit/${adId}`);
  };

  if (authLoading || !user || !appUser || !isEmailVerified) {
    return <div className="flex items-center justify-center min-h-screen"><p>Yükleniyor...</p></div>;
  }
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-background min-h-screen">
      <header className="flex flex-col sm:flex-row justify-between items-center mb-8 pb-6 border-b border-border gap-4">
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
            <Button onClick={() => router.push('/profile')} variant="outline" className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">
                <User size={18} className="mr-2" /> Profil
            </Button>
            <Button onClick={handleLogout} variant="destructive" className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                <LogOut size={18} className="mr-2"/> Çıkış Yap
            </Button>
        </div>
      </header>

      <h2 className="text-2xl font-semibold mb-6 text-foreground">Mevcut Takas İlanları</h2>
      {isLoadingAds ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="w-full animate-pulse bg-card border-border">
                <CardHeader className="flex flex-row items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-muted"></div>
                    <div>
                        <div className="h-4 w-32 bg-muted rounded"></div>
                        <div className="h-3 w-24 bg-muted rounded mt-1"></div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
                    <div className="h-8 w-20 bg-muted rounded"></div>
                    <div className="h-8 w-20 bg-muted rounded"></div>
                </CardFooter>
            </Card>
          ))}
        </div>
      ) : sortedAds.length === 0 ? (
        <div className="text-center py-16 bg-card border border-border rounded-lg shadow-sm">
          <MessageSquarePlus size={64} className="mx-auto text-muted-foreground mb-6" />
          <h3 className="text-xl font-semibold text-foreground mb-2">Henüz Hiç İlan Yok</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">Görünüşe göre etrafta kimse bir şey takas etmiyor. Neden ilk kıvılcımı sen çakmıyorsun?</p>
          <Button onClick={() => router.push('/ads/create')} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <PlusCircle size={18} className="mr-2" /> İlk İlanını Ver
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sortedAds.map((ad) => (
            <AdCard 
                key={ad.id} 
                ad={ad} 
                onRespond={handleOpenRespondDialog} 
                onReport={() => handleOpenReportDialog(ad.id, ad.userId)}
                onEdit={handleEditAd}
                onDelete={handleOpenDeleteDialog}
            />
          ))}
        </div>
      )}

      <Dialog open={showRespondDialog} onOpenChange={setShowRespondDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">İlana Yanıt Ver</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              İlan sahibine ({respondingToAdId ? (ads.find(ad => ad.id === respondingToAdId)?.requested) : '...'}) özel bir mesaj gönderin.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="responseMessage" className="text-foreground">Mesajınız</Label>
            <Textarea 
                id="responseMessage" 
                value={responseMessage} 
                onChange={(e) => setResponseMessage(e.target.value)} 
                placeholder="Takas teklifinizi ve mesajınızı buraya yazın..."
                rows={4}
                className="bg-input border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
            />
            {responseError && <p className="text-sm text-red-500">{responseError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRespondDialog(false)} className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">İptal</Button>
            <Button onClick={handleSubmitResponse} disabled={isSubmittingResponse || !responseMessage.trim()} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {isSubmittingResponse ? 'Gönderiliyor...' : 'Yanıtı Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-destructive"><Flag size={22} className="inline-block mr-2 mb-1"/> İçeriği Rapor Et</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Bu ilanın neden topluluk kurallarına aykırı olduğunu düşünüyorsunuz?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="reportReason" className="text-foreground">Raporlama Nedeni</Label>
            <Select onValueChange={setReportReason} value={reportReason}> 
                <SelectTrigger className="bg-input border-border text-foreground focus:ring-ring">
                    <SelectValue placeholder="Bir neden seçin" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground">
                    <SelectItem value="Spam">Spam</SelectItem>
                    <SelectItem value="Abuse">Taciz / Kötüye Kullanım</SelectItem>
                    <SelectItem value="Misinformation">Yanlış Bilgi / Aldatma</SelectItem>
                    <SelectItem value="Inappropriate Content">Uygunsuz İçerik</SelectItem>
                    <SelectItem value="Other">Diğer</SelectItem>
                </SelectContent>
            </Select>
            {reportError && <p className="text-sm text-red-500">{reportError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)} className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">İptal</Button>
            <Button onClick={handleSubmitReport} disabled={isSubmittingReport || !reportReason} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isSubmittingReport ? 'Gönderiliyor...' : 'Raporu Gönder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">İlanı Silmeyi Onayla</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Bu ilanı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded-md">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAd} className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteAd} disabled={isDeletingAd} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingAd ? "Siliniyor..." : "Evet, Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 