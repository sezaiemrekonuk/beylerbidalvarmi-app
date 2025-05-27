import { NextResponse } from 'next/server';
import { unstable_cache as cache } from 'next/cache';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ad } from '@/lib/types';

// Define the function that fetches ads and will be cached
const getActiveAdsFromFirestore = async (): Promise<Ad[]> => {
  console.log("ROUTE HANDLER: Fetching active ads from Firestore..."); // For debugging
  const adsCollectionRef = collection(db, 'ads');
  const q = query(adsCollectionRef, where('expiresAt', '>', Timestamp.now()), orderBy('createdAt', 'desc'));
  const querySnapshot = await getDocs(q);
  const fetchedAds: Ad[] = [];
  querySnapshot.forEach((doc) => {
    // Important: Convert Firestore Timestamps to string or number if sending directly to client
    // For now, assuming the client-side logic can handle Timestamp objects if they arrive as part of Ad type
    // Or, ensure Ad type uses string/number for dates if this becomes an issue with serialization.
    fetchedAds.push({ id: doc.id, ...doc.data() } as Ad);
  });
  return fetchedAds;
};

// Cache the function
const getCachedActiveAds = cache(
  getActiveAdsFromFirestore,
  ['route-handler-active-ads'], // Unique cache key for this instance
  { revalidate: 60 } // Revalidate every 60 seconds
);

export async function GET() {
  try {
    const ads = await getCachedActiveAds();
    return NextResponse.json(ads);
  } catch (error) {
    console.error("Error in /api/ads GET handler:", error);
    return NextResponse.json({ message: 'Error fetching ads', error: (error as Error).message }, { status: 500 });
  }
} 