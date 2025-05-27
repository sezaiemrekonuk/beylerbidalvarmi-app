'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, Timestamp, orderBy, deleteDoc } from 'firebase/firestore';
import { Ad, AdResponse, AppUser, FullAdResponse, UserAdWithResponses } from '@/lib/types';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Phone, ChevronLeft, PlusCircle, MessageCircle, Inbox } from 'lucide-react';
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
import { useRouter } from 'next/navigation';
import AdCard from '@/components/ads/AdCard';
import { toast } from 'sonner';
import { unstable_cache as cache } from 'next/cache';
import { fetchAdUserDetailsWithCache } from '@/lib/userCache';
import { FirebaseError } from 'firebase/app';

function timeAgoShort(timestamp: Timestamp | Date | undefined): string {
    if (!timestamp) return 'bilinmiyor';
    const now = new Date();
    const tsDate = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const seconds = Math.round((now.getTime() - tsDate.getTime()) / 1000);
    
    if (seconds < 5) return 'az önce';
    if (seconds < 60) return `${seconds}sn önce`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}dk önce`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}sa önce`;
    const days = Math.round(hours / 24);
    return `${days}g önce`;
}

// Cached function to get user ads and their responses
const getCachedUserActivity = cache(
  async (userId: string): Promise<UserAdWithResponses[]> => {
    console.log(`Fetching activity for user ${userId} from Firestore...`); // Debugging
    const adsCollectionRef = collection(db, 'ads');
    const adsQuery = query(adsCollectionRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const adsSnapshot = await getDocs(adsQuery);
    const fetchedUserAds: Ad[] = [];
    adsSnapshot.forEach(doc => fetchedUserAds.push({ id: doc.id, ...doc.data() } as Ad));

    const populatedUserAds: UserAdWithResponses[] = [];

    for (const ad of fetchedUserAds) {
      const responsesCollectionRef = collection(db, 'responses');
      const responsesQuery = query(responsesCollectionRef, where('adId', '==', ad.id), orderBy('createdAt', 'asc'));
      const responsesSnapshot = await getDocs(responsesQuery);
      
      const fetchedResponses: FullAdResponse[] = [];
      for (const responseDoc of responsesSnapshot.docs) {
        const responseData = { id: responseDoc.id, ...responseDoc.data() } as AdResponse;
        let responderDetails: AppUser | undefined = undefined;
        if (responseData.responderId) {
          // Use the existing user cache for responder details
          responderDetails = await fetchAdUserDetailsWithCache(responseData.responderId);
        }
        fetchedResponses.push({ ...responseData, responderDetails, adDetails: ad });
      }
      populatedUserAds.push({ ...ad, responses: fetchedResponses });
    }
    return populatedUserAds;
  },
  // Cache key generator: needs to be an array, first element is base key, then dynamic parts
  ['user-activity'],
  { revalidate: 120 } // Revalidate every 120 seconds
);

export default function MyActivityPage() {
  const { user, appUser, loading: authLoading, isEmailVerified } = useAuth();
  const [userAdsWithResponses, setUserAdsWithResponses] = useState<UserAdWithResponses[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [adToDeleteId, setAdToDeleteId] = useState<string | null>(null);
  const [isDeletingAd, setIsDeletingAd] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const loadUserActivity = async () => {
      if (user && isEmailVerified) {
        setIsLoading(true);
        try {
          const response = await fetch(`/api/user-activity/${user.uid}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch user activity from API');
          }
          let activityData: UserAdWithResponses[] = await response.json();

          // Convert Timestamps after fetching from API
          activityData = activityData.map(userAd => ({
            ...userAd,
            createdAt: userAd.createdAt instanceof Timestamp ? userAd.createdAt : new Timestamp((userAd.createdAt as any).seconds, (userAd.createdAt as any).nanoseconds),
            expiresAt: userAd.expiresAt instanceof Timestamp ? userAd.expiresAt : new Timestamp((userAd.expiresAt as any).seconds, (userAd.expiresAt as any).nanoseconds),
            responses: userAd.responses.map(response => ({
              ...response,
              createdAt: response.createdAt instanceof Timestamp ? response.createdAt : new Timestamp((response.createdAt as any).seconds, (response.createdAt as any).nanoseconds),
              // adDetails within response might also need timestamp conversion if it's ever set directly from API
              // For now, assuming adDetails is mostly for type consistency and populated from parent userAd
            })),
          }));

          setUserAdsWithResponses(activityData);
        } catch (err: unknown) {
          console.error("Kullanıcı hareketleri çekilirken hata (API call): ", err);
          if (err instanceof Error) {
            toast.error("Hareketler Yüklenemedi", { description: err.message || "Verileriniz yüklenirken bir sorun oluştu." });
          } else {
            toast.error("Hareketler Yüklenemedi", { description: "Verileriniz yüklenirken bilinmeyen bir sorun oluştu." });
          }
        }
        setIsLoading(false);
      }
    };

    if (!authLoading && user && isEmailVerified) {
      loadUserActivity();
    } else if (!authLoading && !user) {
      toast.info("Hareketlerinizi görmek için lütfen giriş yapın.");
      router.replace('/login');
    }
  }, [user, authLoading, isEmailVerified, router]);

  const handleOpenDeleteDialog = (adId: string) => {
    setAdToDeleteId(adId);
    setIsDeleteAlertOpen(true);
  };

  const handleConfirmDeleteAd = async () => {
    if (!adToDeleteId) return;
    setIsDeletingAd(true);
    const toastId = toast.loading("İlan siliniyor...");
    try {
      await deleteDoc(doc(db, "ads", adToDeleteId));
      toast.success("İlan başarıyla silindi.", { id: toastId });
      setUserAdsWithResponses(prevAds => prevAds.filter(ad => ad.id !== adToDeleteId));
      setIsDeleteAlertOpen(false);
      setAdToDeleteId(null);
    } catch (err: unknown) {
      console.error("İlan silinirken hata:", err);
      if (err instanceof FirebaseError) {
        toast.error("Silme Başarısız", { id: toastId, description: err.message || "İlan silinemedi." });
      } else if (err instanceof Error) {
        toast.error("Silme Başarısız", { id: toastId, description: err.message || "İlan silinemedi." });
      } else {
        toast.error("Silme Başarısız", { id: toastId, description: "İlan silinirken bilinmeyen bir hata oluştu." });
      }
    }
    setIsDeletingAd(false);
  };

  const handleEditAd = (adId: string) => {
    router.push(`/ads/edit/${adId}`);
  };
  
  if (isLoading || authLoading) {
    return (
        <div className="container mx-auto p-4 text-center min-h-screen flex items-center justify-center bg-background">
            <p className="text-muted-foreground">Hareketleriniz yükleniyor...</p>
        </div>
    );
  }

  if (!user) {
    return (
        <div className="container mx-auto p-4 text-center min-h-screen flex flex-col items-center justify-center bg-background">
            <Inbox size={64} className="text-muted-foreground mb-4" />
            <p className="text-xl text-muted-foreground">Hareketlerinizi görmek için lütfen giriş yapın.</p>
            <Button asChild className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                <Link href="/login">Giriş Yap</Link>
            </Button>
        </div>
    );
  }

  if (userAdsWithResponses.length === 0) {
    return (
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8 min-h-screen flex flex-col items-center justify-center text-center bg-background">
        <Inbox size={80} className="text-muted-foreground mb-6" />
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Hareket Kaydınız Boş</h1>
        <p className="text-muted-foreground max-w-md">
            Görünüşe göre henüz hiç ilan vermemişsiniz veya mevcut ilanlarınıza yanıt gelmemiş. 
            Hemen bir ilan vererek takas yapmaya başlayın!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/ads/create"><PlusCircle size={18} className="mr-2"/> Yeni İlan Ver</Link>
            </Button>
            <Button variant="outline" asChild className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">
              <Link href="/"><ChevronLeft size={18} className="mr-2"/>Tüm İlanlara Dön</Link>
            </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8 bg-background min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-center pb-6 border-b border-border gap-3">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Hareketlerim</h1>
        <div className="flex gap-2">
            <Button variant="outline" asChild className="border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground">
              <Link href="/"><ChevronLeft size={18} className="mr-2"/>Tüm İlanlara Dön</Link>
            </Button>
             <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link href="/ads/create"><PlusCircle size={18} className="mr-2"/> Yeni İlan Ver</Link>
            </Button>
        </div>
      </div>

      {userAdsWithResponses.map(userAd => (
        <Card key={userAd.id} className="bg-card border-border shadow-lg overflow-hidden">
          <CardHeader className="bg-muted/50 p-4 sm:p-6 border-b border-border">
             <AdCard 
                ad={userAd} 
                onRespond={() => {}}
                onReport={() => {}}
                onEdit={handleEditAd}
                onDelete={handleOpenDeleteDialog} 
            />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground border-b border-border pb-2 flex items-center">
                <MessageCircle size={20} className="mr-2 text-primary" /> Bu İlana Gelen Yanıtlar ({userAd.responses.length})
            </h3>
            {userAd.responses.length === 0 ? (
              <p className="text-sm text-muted-foreground pt-2">Bu ilana henüz yanıt verilmemiş.</p>
            ) : (
              <ul className="space-y-4 pt-2">
                {userAd.responses.map(response => (
                  <li key={response.id} className="p-4 border border-border rounded-lg bg-background shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start space-x-3 sm:space-x-4">
                      <Avatar className="h-10 w-10 sm:h-12 sm:w-12 mt-1 flex-shrink-0 border-2 border-primary/30">
                          <AvatarImage src={response.responderDetails?.profilePhotoUrl || undefined} alt={response.responderDetails?.name} />
                          <AvatarFallback className="bg-muted text-muted-foreground">{response.responderDetails?.name?.charAt(0).toUpperCase() || 'K'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-grow min-w-0">
                          <div className="flex flex-col sm:flex-row justify-between items-start gap-1 sm:gap-2">
                            <div className="mb-1 sm:mb-0">
                                <p className="text-md font-semibold text-foreground truncate" title={response.responderDetails?.name || 'Bilinmeyen Kullanıcı'}>
                                    {response.responderDetails?.name || 'Bilinmeyen Kullanıcı'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {response.responderDetails?.universityDomain || 'Üniversite Yok'}
                                </p>
                            </div>
                            {response.responderDetails?.phone && (
                                <Button asChild variant="outline" size="sm" className="text-xs border-primary/50 text-primary hover:bg-primary/10 hover:text-primary flex-shrink-0">
                                    <a href={`tel:${response.responderDetails.phone}`} className="flex items-center space-x-1.5">
                                        <Phone size={13} />
                                        <span>{response.responderDetails.phone}</span>
                                    </a>
                                </Button>
                            )}
                          </div>
                          <p className="text-sm text-foreground mt-2 whitespace-pre-wrap break-words bg-accent/30 p-3 rounded-md">
                            {response.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2 text-right">Yanıt zamanı: {timeAgoShort(response.createdAt)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">İlanı Silmeyi Onayla</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Bu ilanı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
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