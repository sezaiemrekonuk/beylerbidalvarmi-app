'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatRoom } from '@/lib/chat-types';
import { Skeleton } from "@/components/ui/skeleton";

interface ChatRoomSelectionProps {
  rooms: ChatRoom[];
  onRoomSelect: (roomId: string) => void;
  isLoading: boolean;
}

// Placeholder rooms data for now
const placeholderRooms: ChatRoom[] = [
  { id: 'general', name: 'General', description: 'General chat' },
  { id: 'random', name: 'Random', description: 'Random chat' },
  { id: 'tech', name: 'Tech Talk', description: 'Discuss technology' },
];

export function ChatRoomSelection({ rooms = placeholderRooms, onRoomSelect, isLoading }: ChatRoomSelectionProps) {
  const [selectedRoomId, setSelectedRoomId] = React.useState<string | undefined>(undefined);

  const handleRoomChange = (value: string) => {
    setSelectedRoomId(value);
    onRoomSelect(value);
  };

  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-1" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (rooms.length === 0) {
    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader>
                <CardTitle>No Chat Rooms Available</CardTitle>
                <CardDescription>There are currently no chat rooms. Check back later or create one if you are an admin.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Select a Chat Room</CardTitle>
        <CardDescription>Choose a room to start chatting.</CardDescription>
      </CardHeader>
      <CardContent>
        <Select onValueChange={handleRoomChange} value={selectedRoomId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a room" />
          </SelectTrigger>
          <SelectContent>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
} 