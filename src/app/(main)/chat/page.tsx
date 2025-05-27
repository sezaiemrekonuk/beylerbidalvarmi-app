'use client';

import * as React from 'react';
import { ChatRoomSelection } from '@/components/chat/ChatRoomSelection';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatRoom, ChatMessage, User as ChatUser } from '@/lib/chat-types'; // Renamed User to ChatUser to avoid conflict
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp, // Import Timestamp for type checking
  getDocs, // For fetching initial rooms
  doc, // For message subcollection path
  where, // Potentially for querying rooms if needed
  limit // Potentially for paginating messages
} from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

// Define a default or loading user state that matches ChatUser structure
const loadingUser: ChatUser = {
  id: 'loading',
  name: 'Loading...',
};

export default function ChatPage() {
  const { appUser, user: firebaseUser, loading: authLoading } = useAuth();
  const [selectedRoom, setSelectedRoom] = React.useState<ChatRoom | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [availableRooms, setAvailableRooms] = React.useState<ChatRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = React.useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(false);

  // Fetch chat rooms from Firestore
  React.useEffect(() => {
    setIsLoadingRooms(true);
    const roomsCollectionRef = collection(db, 'chatRooms');
    const q = query(roomsCollectionRef, orderBy('name', 'asc')); // Order rooms by name

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rooms: ChatRoom[] = [];
      querySnapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() } as ChatRoom);
      });
      setAvailableRooms(rooms);
      setIsLoadingRooms(false);
    }, (error) => {
      console.error("Error fetching chat rooms: ", error);
      // Handle error appropriately, e.g., show a toast
      setIsLoadingRooms(false);
    });

    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  // Fetch messages for the selected room
  React.useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const messagesCollectionRef = collection(db, `chatRooms/${selectedRoom.id}/messages`);
    const q = query(messagesCollectionRef, orderBy('timestamp', 'asc'), limit(50)); // Get last 50, order by time

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // Rigorous check for timestamp before pushing
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          fetchedMessages.push({
            id: doc.id,
            // Ensure all necessary fields from ChatMessage type are mapped
            roomId: data.roomId as string,
            sender: data.sender as ChatUser, // Assuming ChatUser is the type for sender
            text: data.text as string,
            timestamp: data.timestamp as Timestamp // Firestore data.timestamp is already a Timestamp object
          } as ChatMessage); // Cast to ChatMessage to ensure type conformity
        } else {
          // Log an error or handle messages with missing/invalid timestamps
          console.warn(`Message document with ID ${doc.id} in room ${selectedRoom?.id} has an invalid or missing timestamp.`, data);
          // Optionally, filter out this message or push it with a clearly identifiable invalid state
          // For now, we are filtering it out to prevent rendering issues.
        }
      });
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (error) => {
      console.error(`Error fetching messages for room ${selectedRoom.name}: `, error);
      // Handle error
      setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [selectedRoom]);

  const handleRoomSelect = (roomId: string) => {
    const room = availableRooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      console.log(`Selected room: ${room.name}`);
    } else {
      console.error(`Room with id ${roomId} not found.`);
      setSelectedRoom(null);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!selectedRoom || !appUser || !firebaseUser || messageText.trim() === '') return;

    const currentChatUser: ChatUser = {
        id: firebaseUser.uid, // Use Firebase auth UID
        name: appUser.name || 'Anonymous User', // Fallback name
        avatarUrl: appUser.profilePhotoUrl || undefined,
    };

    try {
      const messagesCollectionRef = collection(db, `chatRooms/${selectedRoom.id}/messages`);
      await addDoc(messagesCollectionRef, {
        roomId: selectedRoom.id,
        sender: currentChatUser, // Store simplified user object
        text: messageText.trim(),
        timestamp: serverTimestamp(),
      });
      console.log(`Message sent to room ${selectedRoom.name}: ${messageText}`);
    } catch (error) {
      console.error("Error sending message: ", error);
      // Handle error, e.g., show a toast to the user
    }
  };
  
  const handleLeaveRoom = () => {
    setSelectedRoom(null);
    setMessages([]); // Clear messages when leaving a room
  };

  // Determine the currentUser for ChatInterface, using appUser data
  // Fallback to a loading state if appUser isn't available yet but auth is loading
  const currentUserForChat: ChatUser = appUser 
    ? { id: firebaseUser?.uid || 'unknown', name: appUser.name, avatarUrl: appUser.profilePhotoUrl }
    : (authLoading ? loadingUser : { id: 'guest', name: 'Guest' }); // Or handle guest/unauthenticated state differently

  if (authLoading && !appUser) {
    return <div className="flex items-center justify-center h-screen"><p>Loading user data...</p></div>;
  }
  
  if (!firebaseUser || !appUser) { // Ensure firebaseUser and appUser are loaded and exist
      // You might want to redirect to login or show a message
      // For now, if Navbar handles redirection this might be okay
      // but ChatPage itself requires an authenticated appUser to function fully.
      return (
        <div className="container mx-auto p-4 h-screen flex flex-col items-center justify-center">
            <p className="mb-4">Please log in to use the chat.</p>
            {/* Optionally, add a login button or rely on global auth handling */}
        </div>
    );
  }

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-var(--navbar-height,80px))] flex flex-col items-center">
      {!selectedRoom ? (
        <ChatRoomSelection 
            rooms={availableRooms} 
            onRoomSelect={handleRoomSelect} 
            isLoading={isLoadingRooms} 
        />
      ) : (
        <>
            <Button onClick={handleLeaveRoom} variant="outline" className="mb-4 self-start">
                <ArrowLeft size={16} className="mr-2" /> Back to Rooms
            </Button>
            <ChatInterface
              room={selectedRoom}
              currentUser={currentUserForChat} 
              messages={messages} 
              onSendMessage={handleSendMessage}
              isLoadingMessages={isLoadingMessages}
            />
        </>
      )}
    </div>
  );
} 