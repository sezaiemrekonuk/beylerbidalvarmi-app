'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChatRoom } from '@/lib/chat-types';

interface ChatRoomSelectionProps {
  rooms: ChatRoom[];
  onRoomSelect: (roomId: string) => void;
}

// Placeholder rooms data for now
const placeholderRooms: ChatRoom[] = [
  { id: 'general', name: 'General', description: 'General chat' },
  { id: 'random', name: 'Random', description: 'Random chat' },
  { id: 'tech', name: 'Tech Talk', description: 'Discuss technology' },
];

export function ChatRoomSelection({ rooms = placeholderRooms, onRoomSelect }: ChatRoomSelectionProps) {
  const [selectedRoom, setSelectedRoom] = React.useState<string | undefined>(undefined);

  const handleRoomChange = (value: string) => {
    setSelectedRoom(value);
    onRoomSelect(value);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Select a Chat Room</CardTitle>
        <CardDescription>Choose a room to start chatting.</CardDescription>
      </CardHeader>
      <CardContent>
        <Select onValueChange={handleRoomChange} value={selectedRoom}>
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