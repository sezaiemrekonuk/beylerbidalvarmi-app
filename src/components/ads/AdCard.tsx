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
import { Clock, Edit3, Trash2, MessageSquare, AlertTriangle, ChevronRight, UserCircle } from 'lucide-react'; // Added icons
import { fetchAdUserDetailsWithCache } from '@/lib/userCache'; // Import the caching function

interface AdCardProps {
  ad: Ad;
  onRespond: (adId: string) => void;
  onReport: (adId: string, reportedUserId: string) => void;
  onEdit?: (adId: string) => void;
  onDelete?: (adId: string) => void;
  showRespondButton?: boolean;
  showReportButton?: boolean;
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

export default function AdCard({ ad, onRespond, onReport, onEdit, onDelete, showRespondButton, showReportButton }: AdCardProps) {
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
      <Card className="w-full animate-pulse bg-card border-border shadow-sm flex flex-row justify-between items-center p-3">
        <div className="flex items-center space-x-3 flex-grow">
            <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0"></div>
            <div className="space-y-1.5 flex-grow">
                <div className="h-4 w-3/4 bg-muted rounded"></div>
                <div className="h-3 w-1/2 bg-muted rounded"></div>
            </div>
        </div>
        <div className="h-8 w-20 bg-muted rounded ml-3 flex-shrink-0"></div>
      </Card>
    );
  }

  if (!adUser) { // Should ideally not be hit if skeleton and fallbacks work
      return <Card className="w-full bg-card border-border p-3 text-center text-destructive">Kullanıcı bilgileri yüklenemedi.</Card>;
  }

  const cardBorderColor = currentAppUser?.universityDomain === adUser.universityDomain 
    ? "border-primary/40 hover:border-primary/70" 
    : "border-border hover:border-muted-foreground/30";

  return (
    <Card className={`w-full flex flex-col sm:flex-row items-stretch bg-card ${cardBorderColor} shadow-sm hover:shadow-md transition-all duration-200 rounded-lg overflow-hidden border`}>
      {/* User Info & Ad Details Section */}
      <div className="flex-grow flex flex-col sm:flex-row items-start sm:items-center p-3 sm:p-4 border-b sm:border-b-0 sm:border-r border-border/70">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-primary/20 flex-shrink-0 mb-2 sm:mb-0 sm:mr-4">
          <AvatarImage src={adUser.profilePhotoUrl || undefined} alt={adUser.name || "Kullanıcı"} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {adUser.name ? adUser.name.charAt(0).toUpperCase() : <UserCircle size={20} />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-grow min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground truncate" title={adUser.universityDomain || "Üniversite Bilgisi Yok"}>
                {adUser.universityDomain || "Üniversite Bilgisi Yok"}
              </p>
              <CardTitle className="text-sm font-semibold text-foreground truncate" title={adUser.name || "Kullanıcı Adı Yok"}>
                {adUser.name || "Kullanıcı Adı Yok"}
              </CardTitle>
            </div>
            <div className={`text-xs mt-1 sm:mt-0 sm:ml-2 flex items-center flex-shrink-0 ${isExpired ? 'text-destructive' : 'text-green-600 dark:text-green-500'}`}>
              <Clock size={13} className="mr-1 flex-shrink-0" />
              {expirationText}
            </div>
          </div>

          <div className="mt-1.5 space-y-0.5">
            <p className="text-xs text-foreground leading-tight truncate" title={ad.requested}>
              <span className="font-medium text-primary/90">İstiyor:</span> {ad.requested}
            </p>
            <p className="text-xs text-foreground leading-tight truncate" title={ad.offered}>
              <span className="font-medium text-primary/90">Teklifi:</span> {ad.offered}
            </p>
          </div>

          {ad.message && (
            <p className="text-xs text-muted-foreground bg-accent/30 dark:bg-accent/20 p-1.5 rounded-md mt-1.5 italic line-clamp-1" title={ad.message}>
              &ldquo;{ad.message}&rdquo;
            </p>
          )}
        </div>
      </div>

      {/* Actions Section - Reverted to CardFooter with original button styles */}
      <CardFooter className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-2 p-4 border-t border-border/50 flex-shrink-0">
        {(typeof showRespondButton === 'boolean' ? showRespondButton : (!isOwnAd && !isExpired)) && (
          <Button variant="default" size="sm" onClick={() => onRespond(ad.id)} className="flex-grow sm:flex-grow-0 bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto">
            <MessageSquare size={16} className="mr-2"/> Yanıt Ver
          </Button>
        )}
        {isOwnAd && !isExpired && onEdit && (
          <Button variant="outline" size="sm" onClick={() => onEdit(ad.id)} className="flex-grow sm:flex-grow-0 border-border hover:bg-accent hover:text-accent-foreground text-accent-foreground w-full sm:w-auto">
            <Edit3 size={16} className="mr-1.5"/> Düzenle
          </Button>
        )}
        {(typeof showReportButton === 'boolean' ? showReportButton : !isOwnAd) && (
           <Button variant="ghost" size="sm" onClick={() => onReport(ad.id, ad.userId)} className="flex-grow sm:flex-grow-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive w-full sm:w-auto">
            <AlertTriangle size={16} className="mr-1.5"/> Rapor Et
          </Button>
        )}
        {isOwnAd && !isExpired && onDelete && ( // Restored !isExpired check
          <Button variant="destructive" size="sm" onClick={() => onDelete(ad.id)} className="flex-grow sm:flex-grow-0 w-full sm:w-auto">
            <Trash2 size={16} className="mr-1.5"/> Sil
          </Button>
        )}
         {isExpired && (
            <p className="text-sm text-destructive font-medium w-full text-center sm:text-right">Süresi Doldu</p>
        )}
      </CardFooter>
    </Card>
  );
} 