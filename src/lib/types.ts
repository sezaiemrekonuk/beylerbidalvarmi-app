import { Timestamp } from 'firebase/firestore';

// User data stored in Firestore
export interface AppUser {
  uid: string;
  name: string;
  email: string;
  universityDomain: string; // e.g. hacettepe.edu.tr
  phone: string;
  profilePhotoUrl: string;
  emailVerified: boolean;
}

// Ad data stored in Firestore
export interface Ad {
  id: string; // Document ID
  userId: string; // UID of the user who posted the ad
  universityDomain: string;
  requested: string; // Requested cigarette (brand/type)
  offered: string; // Offered item(s) in return (text only)
  message?: string; // Optional message
  createdAt: Timestamp; // Or Date, if you convert it after fetching
  expiresAt: Timestamp; // Or Date
}

// Response to an Ad
export interface AdResponse {
    id: string; // Document ID
    responderId: string; // UID of the user responding
    adId: string; // ID of the ad being responded to
    message: string;
    createdAt: Timestamp;
}

// Report data
export interface Report {
    id: string; // Document ID
    reporterId: string; // UID of the user who made the report
    reportedUserId: string; // UID of the user being reported
    adId?: string; // ID of the ad being reported (if applicable)
    reason: string; // Spam, Abuse, Misinformation, Other
    createdAt: Timestamp;
}

// For My Activity Page
export interface FullAdResponse extends AdResponse {
  responderDetails?: AppUser;
  adDetails?: Ad; // Parent Ad, useful if response objects are handled independently sometimes
}

export interface UserAdWithResponses extends Ad {
  responses: FullAdResponse[];
} 