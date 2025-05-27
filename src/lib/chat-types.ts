import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  sender: User;
  text: string;
  timestamp: Timestamp;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
} 