import { unstable_cache as cache } from 'next/cache';
import { collection, query, where, orderBy, getDocs, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Ad, AppUser, AdResponse, UserAdWithResponses, FullAdResponse } from '@/lib/types';
import { fetchAdUserDetailsWithCache } from '@/lib/userCache'; // For responder details

// Define the function that fetches user activity and will be cached
const getUserActivityFromFirestore = async (userId: string): Promise<UserAdWithResponses[]> => {
  // console.log(`SERVICE: Fetching activity for user ${userId} from Firestore...`);
  const adsCollectionRef = collection(db, 'ads');
  const adsQuery = query(adsCollectionRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const adsSnapshot = await getDocs(adsQuery);
  // console.log(`SERVICE: Found ${adsSnapshot.size} ads for user ${userId}`);
  const fetchedUserAds: Ad[] = [];
  adsSnapshot.forEach(doc => fetchedUserAds.push({ id: doc.id, ...doc.data() } as Ad));

  const populatedUserAds: UserAdWithResponses[] = [];

  for (const ad of fetchedUserAds) {
    const responsesCollectionRef = collection(db, 'responses');
    const responsesQuery = query(responsesCollectionRef, where('adId', '==', ad.id), orderBy('createdAt', 'asc'));
    
    try {
      const responsesSnapshot = await getDocs(responsesQuery);
      // console.log(`SERVICE: Successfully fetched ${responsesSnapshot.size} responses for ad ${ad.id}`);
      
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

    } catch (error) {
      // console.error(`SERVICE: Failed to fetch responses for ad ${ad.id} (owned by ${userId}). Error:`, error);
      // Add the ad with empty responses if fetching its responses fails.
      // This allows the rest of the activity to load.
      populatedUserAds.push({ ...ad, responses: [] }); 
    }
  }
  return populatedUserAds;
};

// Cache the function
export const getCachedUserActivity = cache(
  getUserActivityFromFirestore,
  ['service-user-activity'], // Base cache key part
  { revalidate: 120 } // Revalidate every 120 seconds
);

// It's also good practice to export the underlying function if it needs to be called without caching in some scenarios
export { getUserActivityFromFirestore }; 