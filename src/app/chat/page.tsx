'use client';

import * as React from 'react';
import { ChatRoomSelection } from '@/components/chat/ChatRoomSelection';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { ChatRoom, ChatMessage, User } from '@/lib/chat-types';

// Placeholder rooms and user data
const placeholderRooms: ChatRoom[] = [
  { id: 'general', name: 'General', description: 'General chat for everyone' },
  { id: 'random', name: 'Random', description: 'Talk about anything random' },
  { id: 'tech', name: 'Tech Talk', description: 'Discuss all things technology' },
  { id: 'gaming', name: 'Gaming Zone', description: 'For all the gamers' },
];

const placeholderUser: User = {
  id: 'user123',
  name: 'Current User',
  avatarUrl: 'https://github.com/shadcn.png' // Example avatar
};

export default function ChatPage() {
  const [selectedRoom, setSelectedRoom] = React.useState<ChatRoom | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]); // This will eventually come from a backend
  const [availableRooms, setAvailableRooms] = React.useState<ChatRoom[]>(placeholderRooms);

  const handleRoomSelect = (roomId: string) => {
    const room = availableRooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      // Here you would typically fetch messages for the selected room
      // For now, we'll just clear messages or use placeholder ones if ChatInterface handles them
      setMessages([]); // Clear previous messages
      console.log(`Selected room: ${room.name}`);
    } else {
      console.error(`Room with id ${roomId} not found.`);
      setSelectedRoom(null); // Reset selection if room not found
    }
  };

  const handleSendMessage = (messageText: string) => {
    if (!selectedRoom || !placeholderUser) return;

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      roomId: selectedRoom.id,
      sender: placeholderUser,
      text: messageText,
      timestamp: new Date(),
    };

    // In a real app, this message would be sent to a backend (e.g., Firebase, Supabase, your own API)
    // and then pushed to other clients in the room.
    // For this example, we'll just add it to our local state.
    setMessages(prevMessages => [...prevMessages, newMessage]);
    console.log(`Sending message to room ${selectedRoom.name}: ${messageText}`);
  };

  return (
    <div className="container mx-auto p-4 h-screen flex flex-col items-center justify-center">
      {!selectedRoom ? (
        <ChatRoomSelection rooms={availableRooms} onRoomSelect={handleRoomSelect} />
      ) : (
        <ChatInterface
          room={selectedRoom}
          currentUser={placeholderUser} // Pass the current user
          messages={messages} // Pass messages for the selected room
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
} 