'use client';

import * as React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { ChatMessage, ChatRoom, User } from '@/lib/chat-types';
import { SendHorizontal } from 'lucide-react';

interface ChatInterfaceProps {
  room: ChatRoom;
  currentUser: User; // Assuming we have a way to get the current user
  onSendMessage: (messageText: string) => void;
  messages: ChatMessage[];
}

// Placeholder current user
const placeholderUser: User = {
  id: 'user123',
  name: 'Current User',
  avatarUrl: 'https://github.com/shadcn.png' // Example avatar
};

// Placeholder messages for now
const placeholderMessages: ChatMessage[] = [
  {
    id: 'msg1',
    roomId: 'general',
    sender: { id: 'user1', name: 'Alice', avatarUrl: 'https://randomuser.me/api/portraits/women/1.jpg' },
    text: 'Hello there!',
    timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
  },
  {
    id: 'msg2',
    roomId: 'general',
    sender: placeholderUser,
    text: 'Hi Alice! How are you?',
    timestamp: new Date(Date.now() - 4 * 60 * 1000), // 4 minutes ago
  },
  {
    id: 'msg3',
    roomId: 'general',
    sender: { id: 'user2', name: 'Bob', avatarUrl: 'https://randomuser.me/api/portraits/men/1.jpg' },
    text: 'Hey everyone!',
    timestamp: new Date(Date.now() - 3 * 60 * 1000), // 3 minutes ago
  },
  {
    id: 'msg4',
    roomId: 'general',
    sender: { id: 'user1', name: 'Alice', avatarUrl: 'https://randomuser.me/api/portraits/women/1.jpg' },
    text: "I'm doing great, thanks for asking!",
    timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 minutes ago
  },
    {
    id: 'msg5',
    roomId: 'general',
    sender: placeholderUser,
    text: "That's good to hear!",
    timestamp: new Date(Date.now() - 1 * 60 * 1000), // 1 minute ago
  },
];

export function ChatInterface({
  room,
  currentUser = placeholderUser,
  onSendMessage,
  messages = placeholderMessages
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = React.useState('');
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  React.useEffect(() => {
    // Scroll to bottom when messages change
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages]);

  return (
    <Card className="w-full h-[calc(100vh-100px)] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{room.name}</CardTitle>
        {/* Potentially add room actions here like leave room, room info etc. */}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {messages.map((msg) => (
            <ChatMessageComponent
              key={msg.id}
              message={msg}
              isCurrentUser={msg.sender.id === currentUser.id}
            />
          ))}
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
          <Input
            type="text"
            placeholder={`Message #${room.name}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            autoComplete="off"
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim()}>
            <SendHorizontal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
} 