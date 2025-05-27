'use client';

import { ChatMessage as ChatMessageType } from '@/lib/chat-types';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface ChatMessageProps {
  message: ChatMessageType;
  isCurrentUser: boolean; // To style user's own messages differently
}

export function ChatMessage({ message, isCurrentUser }: ChatMessageProps) {
  const senderInitial = message.sender.name.substring(0, 1).toUpperCase();

  return (
    <div className={cn("flex items-start gap-3 my-3", isCurrentUser ? "justify-end" : "")}>
      {!isCurrentUser && (
        <Avatar className="h-8 w-8">
          {message.sender.avatarUrl && <AvatarImage src={message.sender.avatarUrl} alt={message.sender.name} />}
          <AvatarFallback>{senderInitial}</AvatarFallback>
        </Avatar>
      )}
      <div className={cn(
        "max-w-[70%] rounded-lg p-3 text-sm",
        isCurrentUser
          ? "bg-primary text-primary-foreground"
          : "bg-muted"
      )}>
        {!isCurrentUser && <p className="font-semibold mb-1">{message.sender.name}</p>}
        <p>{message.text}</p>
        <p className={cn("text-xs mt-1", isCurrentUser ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      {isCurrentUser && (
        <Avatar className="h-8 w-8">
          {message.sender.avatarUrl && <AvatarImage src={message.sender.avatarUrl} alt={message.sender.name} />}
          <AvatarFallback>{senderInitial}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
} 