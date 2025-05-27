import { NextResponse } from 'next/server';
import { unstable_cache as cache } from 'next/cache';
import { collection, query, where, orderBy, getDocs, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ad, AppUser, AdResponse, UserAdWithResponses, FullAdResponse } from '@/lib/types';
import { fetchAdUserDetailsWithCache } from '@/lib/userCache'; // For responder details

// Define the function that fetches user activity and will be cached
const getUserActivityFromFirestore = async (userId: string): Promise<UserAdWithResponses[]> => {
  console.log(`ROUTE HANDLER: Fetching activity for user ${userId} from Firestore...`);
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
        responderDetails = await fetchAdUserDetailsWithCache(responseData.responderId);
      }
      // Ensure Timestamps in responseData are handled if necessary before sending to client
      fetchedResponses.push({ ...responseData, responderDetails, adDetails: ad });
    }
    // Ensure Timestamps in ad are handled
    populatedUserAds.push({ ...ad, responses: fetchedResponses });
  }
  return populatedUserAds;
};

// Cache the function
const getCachedUserActivity = cache(
  getUserActivityFromFirestore,
  ['route-handler-user-activity'], // Base cache key part
  { revalidate: 120 } // Revalidate every 120 seconds
);

export async function GET(request: Request, { params }: { params: { userId: string } }) {
  const userId = params.userId;
  if (!userId) {
    return NextResponse.json({ message: 'User ID is required' }, { status: 400 });
  }

  try {
    const userActivity = await getCachedUserActivity(userId);
    // Ensure Timestamps are serializable: convert to string or number if not already handled.
    // For now, assuming client will rehydrate. If issues, convert here.
    return NextResponse.json(userActivity);
  } catch (error) {
    console.error(`Error in /api/user-activity/${userId} GET handler:`, error);
    return NextResponse.json({ message: 'Error fetching user activity', error: (error as Error).message }, { status: 500 });
  }
} 