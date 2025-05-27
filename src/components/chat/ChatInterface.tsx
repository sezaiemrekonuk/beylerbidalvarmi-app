'use client';

import * as React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage as ChatMessageComponent } from './ChatMessage';
import { ChatMessage, ChatRoom, User as ChatUser } from '@/lib/chat-types';
import { SendHorizontal } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

interface ChatInterfaceProps {
  room: ChatRoom;
  currentUser: ChatUser;
  onSendMessage: (messageText: string) => void;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
}

export function ChatInterface({
  room,
  currentUser,
  onSendMessage,
  messages,
  isLoadingMessages
}: ChatInterfaceProps) {
  const [newMessage, setNewMessage] = React.useState('');
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  React.useEffect(() => {
    // Scroll to bottom when messages change or when first loading
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between border-b">
        <CardTitle>{room.name}</CardTitle>
        {/* Room actions like leave, info etc. can go here */}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
          {isLoadingMessages ? (
            <div className="space-y-4 p-2">
              <Skeleton className="h-12 w-3/4" />
              <Skeleton className="h-12 w-3/4 ml-auto" /> 
              <Skeleton className="h-12 w-3/4" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No messages yet. Be the first to say something!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessageComponent
                key={msg.id}
                message={msg}
                isCurrentUser={msg.sender.id === currentUser.id}
              />
            ))
          )}
          <div ref={messagesEndRef} />
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
            disabled={isLoadingMessages}
          />
          <Button type="submit" size="icon" disabled={!newMessage.trim() || isLoadingMessages}>
            <SendHorizontal className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
} 