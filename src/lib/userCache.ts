import { AppUser } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const userCache = new Map<string, AppUser>();
const userFetchPromises = new Map<string, Promise<AppUser | null>>();

// Function to get a fallback user structure
const getFallbackUser = (status: 'not_found' | 'error', userId?: string): AppUser => ({
  uid: userId || '',
  emailVerified: false,
  name: status === 'not_found' ? 'Bilinmeyen Kullanıcı' : 'Hata Oluştu',
  email: '',
  phone: '',
  universityDomain: status === 'not_found' ? 'Bilinmeyen Üniv.' : 'Veri Çekilemedi',
  profilePhotoUrl: '',
  // Ensure all required fields from AppUser are present
  // createdAt: new Date(), // Or appropriate default // Removed as it's not in AppUser type
});

export const fetchAdUserDetailsWithCache = async (userId: string): Promise<AppUser> => {
  if (userCache.has(userId)) {
    return userCache.get(userId)!;
  }

  if (userFetchPromises.has(userId)) {
    // A fetch for this user is already in progress, await its result
    const user = await userFetchPromises.get(userId)!;
    return user || getFallbackUser('not_found', userId); // Handle if promise resolved to null
  }

  const fetchPromise = (async (): Promise<AppUser | null> => {
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as AppUser;
        userCache.set(userId, userData);
        return userData;
      } else {
        console.warn(`İlanı veren kullanıcı (ID: ${userId}) bulunamadı.`);
        // Cache a 'not_found' user to prevent re-fetching for a known non-existent user in this session
        const fallback = getFallbackUser('not_found', userId);
        userCache.set(userId, fallback);
        return fallback; 
      }
    } catch (error) {
      console.error(`Kullanıcı (ID: ${userId}) detayı çekilirken hata:`, error);
      // Cache an 'error' user to prevent re-fetching after an error in this session
      const fallback = getFallbackUser('error', userId);
      userCache.set(userId, fallback);
      return fallback; 
    } finally {
      // Remove the promise from the map once it's settled
      userFetchPromises.delete(userId);
    }
  })();

  userFetchPromises.set(userId, fetchPromise);
  
  const user = await fetchPromise;
  return user || getFallbackUser('not_found', userId); // Should be redundant due to fallback in promise, but good for safety
};

// Optional: Function to clear cache if needed, e.g., on logout or for testing
export const clearUserCache = () => {
  userCache.clear();
  userFetchPromises.clear();
  console.log('User cache cleared.');
}; 