'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Ad, AppUser } from "@/lib/types"; // We'll create this types file next
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import { Timestamp } from "firebase/firestore"; // Import Timestamp
import { Clock, Edit3, Trash2, MessageSquare, AlertTriangle } from 'lucide-react'; // Added icons
import { fetchAdUserDetailsWithCache } from '@/lib/userCache'; // Import the caching function

interface AdCardProps {
  ad: Ad;
  onRespond: (adId: string) => void;
  onReport: (adId: string, reportedUserId: string) => void;
  onEdit?: (adId: string) => void;
  onDelete?: (adId: string) => void;
}

function timeAgo(timestamp: Timestamp | Date, toFuture: boolean = false): string {
    const now = new Date();
    // Ensure timestamp is a Date object before getTime()
    const tsDate = timestamp instanceof Timestamp ? timestamp.toDate() : timestamp;
    const ts = tsDate.getTime();
    
    let seconds = Math.round((ts - now.getTime()) / 1000);
    let prefix = "kaldı";
    let suffix = "önce";

    if (!toFuture) {
        seconds = Math.round((now.getTime() - ts) / 1000);
        prefix = ""; // No prefix when counting from past
    }
    
    if (seconds < 0 && !toFuture && Math.abs(seconds) < 5) return 'az önce'; 
    if (seconds < 0 && toFuture) return 'süresi doldu';

    const days = Math.floor(seconds / (3600*24));
    const hours = Math.floor((seconds % (3600*24)) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) return `${days}g ${toFuture ? prefix : suffix}`.trim();
    if (hours > 0) return `${hours}sa ${toFuture ? prefix : suffix}`.trim();
    if (minutes > 0) return `${minutes}dk ${toFuture ? prefix : suffix}`.trim();
    // For future, show seconds if less than a minute
    if (toFuture && secs >= 0 && minutes < 1 && hours < 1 && days < 1) return `${secs}sn ${prefix}`.trim();
    // For past, show seconds if less than a minute, otherwise 'az önce'
    if (!toFuture && secs >= 0 && minutes < 1 && hours < 1 && days < 1) return `${secs}sn ${suffix}`.trim();
    
    return toFuture ? 'süresi doluyor' : 'az önce';
}

export default function AdCard({ ad, onRespond, onReport, onEdit, onDelete }: AdCardProps) {
  const { user: currentUser, appUser: currentAppUser } = useAuth();
  const [adUser, setAdUser] = useState<AppUser | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const fetchAdUser = async () => {
      setIsLoadingUser(true);
      try {
        const userDetails = await fetchAdUserDetailsWithCache(ad.userId);
        setAdUser(userDetails);
      } catch (error) { // This catch might be redundant if cache function always returns a fallback
        console.error("Error fetching user details for ad card (should be handled by cache fallback):", error);
        // The cache function itself should return a fallback, so direct error handling here might not be needed
        // Or, ensure fetchAdUserDetailsWithCache *never* throws for expected cases like not found
      }
      setIsLoadingUser(false);
    };

    if (ad.userId) {
      fetchAdUser();
    }
  }, [ad.userId, ad.id]);

  const expirationText = ad.expiresAt ? timeAgo(ad.expiresAt, true) : "Süre bilgisi yok";
  const postedDateText = ad.createdAt ? timeAgo(ad.createdAt) : "Bilinmiyor";
  const isExpired = expirationText === 'süresi doldu';
  const isOwnAd = currentUser && currentUser.uid === ad.userId;

  // Skeleton Loader for AdCard
  if (isLoadingUser) { // Show skeleton if ad user is loading OR if adUser is null and not an error case (though fallback should prevent this)
    return (
      <Card className="w-full max-w-md animate-pulse bg-card border-border shadow-md flex flex-col justify-between">
        <CardHeader className="flex flex-row items-center space-x-3 p-4">
            <div className="h-10 w-10 rounded-full bg-muted"></div>
            <div>
                <div className="h-4 w-32 bg-muted rounded"></div>
                <div className="h-3 w-24 bg-muted rounded mt-1"></div>
            </div>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-full mt-2"></div> {/* Placeholder for message */}
            <div className="flex justify-between mt-3">
              <div className="h-3 bg-muted rounded w-1/3"></div>
              <div className="h-3 bg-muted rounded w-1/4"></div>
            </div>
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 p-4 pt-3">
            <div className="h-9 w-24 bg-muted rounded"></div>
            <div className="h-9 w-24 bg-muted rounded"></div>
        </CardFooter>
      </Card>
    );
  }

  if (!adUser) { // Should ideally not be hit if skeleton and fallbacks work
      return <Card className="w-full max-w-md bg-card border-border p-4 text-center text-destructive">Kullanıcı bilgileri yüklenemedi.</Card>;
  }

  const cardBorderColor = currentAppUser?.universityDomain === adUser.universityDomain 
    ? "border-primary/50 shadow-lg" 
    : "border-border shadow-md";

  return (
    <Card className={`w-full max-w-md flex flex-col justify-between bg-card ${cardBorderColor} hover:shadow-lg transition-shadow duration-300 overflow-hidden rounded-lg`}>
      <div>
        <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-border/70">
          <Avatar className="h-12 w-12 border-2 border-primary/20 flex-shrink-0">
            <AvatarImage src={adUser.profilePhotoUrl || undefined} alt={adUser.name || "Kullanıcı"} />
            <AvatarFallback className="bg-muted text-muted-foreground text-lg">{adUser.name?.charAt(0).toUpperCase() || 'K'}</AvatarFallback>
          </Avatar>
          <div className="overflow-hidden">
            <CardTitle className="text-sm font-semibold text-foreground truncate" title={adUser.name || "Kullanıcı Adı Yok"}>{adUser.name || "Kullanıcı Adı Yok"}</CardTitle>
            <p className="text-xs text-muted-foreground truncate" title={adUser.universityDomain || "Üniversite Bilgisi Yok"}>{adUser.universityDomain || "Üniversite Bilgisi Yok"}</p>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-2">
          <div>
            <span className="font-medium text-xs text-primary/90 block">İSTİYOR:</span>
            <p className="text-sm text-foreground leading-snug ml-1 truncate" title={ad.requested}>{ad.requested}</p>
          </div>
          <div>
            <span className="font-medium text-xs text-primary/90 block">TEKLİFİ:</span>
            <p className="text-sm text-foreground leading-snug ml-1 truncate" title={ad.offered}>{ad.offered}</p>
          </div>
          
          {ad.message && (
            <p className="text-sm text-foreground bg-accent/40 dark:bg-accent/20 p-2 rounded-md mt-2 italic line-clamp-2" title={ad.message}>
              &ldquo;{ad.message}&rdquo;
            </p>
          )}

          <div className="text-xs text-muted-foreground pt-2 flex flex-row justify-between items-center">
            <span>Yayınlanma: {postedDateText}</span>
            <span className={`flex items-center font-medium ${isExpired ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}>
                <Clock size={13} className="mr-1 flex-shrink-0" />
                {expirationText}
            </span>
          </div>
        </CardContent>
      </div>
      <CardFooter className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 p-4 border-t border-border/50 mt-auto">
        {!isOwnAd && !isExpired && (
          <Button variant="default" size="sm" onClick={() => onRespond(ad.id)} className="flex-grow sm:flex-grow-0 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
            <MessageSquare size={16} className="mr-2"/> Yanıt Ver
          </Button>
        )}
        {isOwnAd && !isExpired && onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(ad.id)} className="flex-grow sm:flex-grow-0 border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground w-full sm:w-auto">
            <Edit3 size={16} className="mr-1.5"/> Düzenle
          </Button>
        )}
        {!isOwnAd && (
           <Button variant="ghost" size="sm" onClick={() => onReport(ad.id, ad.userId)} className="flex-grow sm:flex-grow-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto">
            <AlertTriangle size={16} className="mr-1.5"/> Rapor Et
          </Button>
        )}
        {isOwnAd && !isExpired && onDelete && (
          <Button variant="destructive" size="sm" onClick={() => onDelete(ad.id)} className="flex-grow sm:flex-grow-0 bg-destructive text-destructive-foreground hover:bg-destructive/90 w-full sm:w-auto">
            <Trash2 size={16} className="mr-1.5"/> Sil
          </Button>
        )}
        {isExpired && (
            <p className="text-sm text-destructive font-medium w-full text-center sm:text-right">Bu ilanın süresi dolmuş.</p>
        )}
      </CardFooter>
    </Card>
  );
} 