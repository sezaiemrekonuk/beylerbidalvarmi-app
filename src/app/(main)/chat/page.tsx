'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, doc, onSnapshot, Timestamp, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { ChatRoom, ChatMessage as MessageType, User as ChatUser } from '@/lib/chat-types';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { ChatRoomSelection } from '@/components/chat/ChatRoomSelection';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChevronLeft } from 'lucide-react';

// Define a default or loading user state that matches ChatUser structure
const loadingUser: ChatUser = {
  id: 'loading',
  name: 'Yükleniyor...', // Turkish: Loading...
};

export default function ChatPage() {
  const { user, appUser, loading: authLoading, isEmailVerified } = useAuth();
  const [selectedChatRoomId, setSelectedChatRoomId] = useState<string | null>(null);
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Fetch chat rooms for the current user
  useEffect(() => {
    setIsLoading(true);
    const roomsCollectionRef = collection(db, 'chatRooms');
    const q = query(roomsCollectionRef, orderBy('name', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const rooms: ChatRoom[] = [];
      querySnapshot.forEach((doc) => {
        rooms.push({ id: doc.id, ...doc.data() } as ChatRoom);
      });
      setChatRooms(rooms);
      setIsLoading(false);
    }, (err) => {
      console.error("Sohbet odaları çekilirken hata: ", err);
      setError("Sohbet odaları yüklenemedi.");
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch messages for the selected room
  useEffect(() => {
    if (!selectedChatRoomId) {
      setMessages([]);
      return;
    }

    setIsLoadingMessages(true);
    const messagesCollectionRef = collection(db, `chatRooms/${selectedChatRoomId}/messages`);
    const q_messages = query(messagesCollectionRef, orderBy('timestamp', 'asc'), limit(50));

    const unsubscribeMessages = onSnapshot(q_messages, (querySnapshot) => {
      const fetchedMessages: MessageType[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.timestamp && typeof data.timestamp.toDate === 'function') {
          fetchedMessages.push({
            id: doc.id,
            roomId: data.roomId as string,
            sender: data.sender as ChatUser,
            text: data.text as string,
            timestamp: data.timestamp as Timestamp,
          } as MessageType);
        } else {
          console.warn(`Mesajda geçersiz zaman damgası: ${doc.id}`, data);
        }
      });
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (err) => {
      console.error(`${selectedChatRoomId} için mesajlar çekilirken hata: `, err);
      setIsLoadingMessages(false);
    });

    return () => unsubscribeMessages();
  }, [selectedChatRoomId]);

  useEffect(() => {
    const calculateMaxHeight = () => {
      if (chatContainerRef.current) {
        const navbarElement = document.querySelector('header');
        const navbarHeight = navbarElement ? navbarElement.offsetHeight : 0;
        const screenHeight = window.innerHeight;
        const calculatedHeight = screenHeight - navbarHeight;
        chatContainerRef.current.style.height = `${Math.max(calculatedHeight, 300)}px`;
      }
    };

    if (typeof window !== "undefined") {
      calculateMaxHeight();
      window.addEventListener('resize', calculateMaxHeight);
      return () => {
        window.removeEventListener('resize', calculateMaxHeight);
      };
    }
  }, [selectedChatRoomId]);

  const handleRoomSelect = (roomId: string) => {
    const room = chatRooms.find(r => r.id === roomId);
    if (room) {
      setSelectedChatRoomId(room.id);
    } else {
      setSelectedChatRoomId(null);
    }
  };

  const handleSendMessage = async (messageText: string) => {
    if (!selectedChatRoomId || !appUser || !user || messageText.trim() === '') return;

    const currentChatUser: ChatUser = {
      id: user.uid,
      name: appUser.name || 'Bilinmeyen Kullanıcı',
      avatarUrl: appUser.profilePhotoUrl || undefined,
    };

    try {
      const messagesCollectionRef = collection(db, `chatRooms/${selectedChatRoomId}/messages`);
      await addDoc(messagesCollectionRef, {
        roomId: selectedChatRoomId,
        sender: currentChatUser,
        text: messageText.trim(),
        timestamp: serverTimestamp(),
      });
    } catch (err) {
      console.error("Mesaj gönderilirken hata: ", err);
    }
  };

  const handleLeaveRoom = () => {
    setSelectedChatRoomId(null);
  };

  const currentUserForChat: ChatUser = appUser
    ? { id: user?.uid || 'unknown', name: appUser.name, avatarUrl: appUser.profilePhotoUrl }
    : (authLoading ? loadingUser : { id: 'guest', name: 'Misafir', avatarUrl: undefined });

  if (authLoading && !appUser) {
    return <div className="flex items-center justify-center min-h-screen bg-background text-muted-foreground">Kullanıcı doğrulanıyor...</div>;
  }

  if (!user || !appUser) {
    return (
      <div className="container mx-auto p-4 min-h-screen flex flex-col items-center justify-center text-center bg-background">
        <ChevronLeft size={64} className="text-muted-foreground mb-4" />
        <p className="text-xl text-muted-foreground mb-4">Sohbeti kullanmak için lütfen giriş yapın.</p>
        <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
          <a href="/login">Giriş Yap</a>
        </Button>
      </div>
    );
  }
  
  const selectedRoomDetails = chatRooms.find(r => r.id === selectedChatRoomId);

  return (
    <div ref={chatContainerRef} className="flex flex-col h-screen bg-background overflow-hidden">
      {!selectedChatRoomId ? (
        <ChatRoomSelection
          rooms={chatRooms}
          onRoomSelect={handleRoomSelect}
          isLoading={isLoading}
        />
      ) : selectedRoomDetails ? ( 
        <div className="w-full flex-grow flex flex-col items-stretch min-h-0">
          <div className="p-3 border-b border-border bg-card flex-shrink-0 flex items-center justify-between">
            <Button onClick={handleLeaveRoom} variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} className="mr-2" /> Odalara Dön
            </Button>
            <h2 className="text-lg font-semibold text-foreground">{selectedRoomDetails.name}</h2>
            <div className="w-10"></div>
          </div>
          <div className="flex-grow min-h-0">
            <ChatInterface
              room={selectedRoomDetails}
              currentUser={currentUserForChat}
              messages={messages}
              onSendMessage={handleSendMessage}
              isLoadingMessages={isLoadingMessages}
            />
          </div>
        </div>
      ) : (
         <div className="flex items-center justify-center flex-grow text-muted-foreground">Oda bulunamadı veya yükleniyor...</div>
      )}
    </div>
  );
} 