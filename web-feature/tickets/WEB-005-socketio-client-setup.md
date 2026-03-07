# WEB-005 — Socket.IO Client Setup & Provider

## Objective
Implement the Socket.IO client-side integration: a typed socket client factory, a React context provider that manages the connection lifecycle, and a `useSocket` hook for components to interact with real-time events. This powers the live attendance, real-time Q&A, and group chat features.

## Background
The backend uses Socket.IO for: attendance broadcasting, Q&A messages, reactions, vote updates, and attendance check-in events. The web app must connect to the same Socket.IO server. This ticket establishes a single, managed connection that persists across navigation within the authenticated session, properly reconnects on disconnect, and provides typed event emission/listening.

## Scope
- Install `socket.io-client`
- Create socket client factory (`src/lib/socket/client.ts`)
- Define all socket event types in `src/types/socket.ts`
- Create `SocketProvider` React context that:
  - Connects after user authenticates
  - Emits `addOnlineUser` on connect
  - Disconnects on sign-out
  - Handles reconnection automatically
- Create `useSocket` hook for components
- Create typed event emission helpers: `useSubjectRoom`, `useChannelRoom`
- Create `useSocketEvent` hook for listening to specific events

## Out of Scope
- Feature-specific socket event handling (those live in feature components)
- Auth state (WEB-008)
- Any UI components

## Dependencies
- WEB-001

## User Flow Context
Used in:
- UF-07/UF-08/UF-09 (attendance): teacher emits `attendace`; students receive `receiveAttendance`; teacher sees `receiveUserAttendance`
- UF-10/UF-11 (discussion): `sendMessageToSubject`, `receiveSubjectMessage`, `sendResolve`, etc.
- UF-18 (group chat): subject-level messaging

## Functional Requirements
1. Socket connects to `env.NEXT_PUBLIC_SOCKET_URL` with options: `transports: ['websocket']`, `autoConnect: false`
2. Connection is initiated only after user is authenticated (called from `SocketProvider` after auth state is set)
3. On connect: emit `addOnlineUser` with `userId`
4. On disconnect: clean up all room subscriptions
5. Socket instance is a singleton — reuse the same connection across navigation
6. `SocketProvider` exposes: `socket`, `isConnected`, `onlineUsers`
7. `useSocketEvent(event, handler)` auto-cleans listener on unmount
8. `useSubjectRoom(subjectId)` joins subject room on mount, leaves on unmount
9. `useChannelRoom(subjectId, channelId)` joins channel sub-room on mount, leaves on unmount
10. All event names are typed constants — no magic string usage in feature components

## UI Requirements
No UI. Connection status may optionally show an indicator in the shell (WEB-010).

## API Requirements
No HTTP API calls. Uses Socket.IO WebSocket protocol.

## Backend Changes
None. Uses existing Socket.IO server events exactly as documented.

## Technical Implementation Notes

### Install
```bash
npm install socket.io-client
```

### Socket Event Types (`src/types/socket.ts`)
```typescript
// All events from backend app.js
export interface ServerToClientEvents {
  getOnlineUsers: (users: Array<{ userID: string; socketID: string }>) => void;
  receiveSubjectMessage: (message: Discussion) => void;
  receiveChannelMessage: (message: Post) => void;
  receiveReply: (message: Discussion) => void;
  receiveVote: (message: Discussion) => void;
  receiveReaction: (data: { messageID: string; reaction: Reaction }) => void;
  receiveUpdateReaction: (data: { messageID: string; reaction: Reaction }) => void;
  receiveUserAttendance: (data: { student: User; index: number; status: string }) => void;
  receiveUpdateAttendance: (student: User) => void;
  receiveResolve: (messageID: string) => void;
  receiveDeleteMessage: (messageID: string) => void;
  receiveRevokedMessage: (messageID: string) => void;
  receiveAttendance: (dataMsg: AttendanceMessage) => void;
}

export interface ClientToServerEvents {
  addOnlineUser: (userID: string) => void;
  joinSubject: (data: { userID: string; subjectID: string }) => void;
  leaveSubject: (data: { userID: string; subjectID: string }) => void;
  joinSubjectChannel: (data: { userID: string; subjectID: string; channelID: string }) => void;
  leaveSubjectChannel: (data: { userID: string; subjectID: string; channelID: string }) => void;
  sendMessageToSubject: (data: { subjectID: string; message: Discussion; dataMsg: FCMMessage }) => void;
  sendMessageToChannel: (data: { subjectID: string; channelID: string; message: Post; dataMsg: FCMMessage }) => void;
  sendReply: (data: { subjectID: string; message: Discussion }) => void;
  sendVote: (data: { subjectID: string; message: Discussion }) => void;
  sendReaction: (data: { subjectID: string; messageID: string; reaction: Reaction }) => void;
  sendUpdateReaction: (data: { subjectID: string; messageID: string; reaction: Reaction }) => void;
  sendAttendance: (data: { subjectID: string; student: User; index: number; status: string }) => void;
  sendUpdateAttendance: (data: { subjectID: string; student: User }) => void;
  sendResolve: (data: { subjectID: string; messageID: string }) => void;
  sendDeleteMessage: (data: { subjectID: string; messageID: string }) => void;
  sendRevokedMessage: (data: { subjectID: string; messageID: string }) => void;
  attendace: (data: { subjectID: string; dataMsg: AttendanceMessage }) => void;
}
```

### Socket Client Factory (`src/lib/socket/client.ts`)
```typescript
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@/types/socket';
import { env } from '@/lib/env';

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socketInstance: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socketInstance) {
    socketInstance = io(env.NEXT_PUBLIC_SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

export function destroySocket(): void {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}
```

### Socket Context (`src/providers/SocketProvider.tsx`)
```tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { getSocket, destroySocket, type AppSocket } from '@/lib/socket/client';
import { useAuthStore } from '@/stores/authStore';

interface SocketContextValue {
  socket: AppSocket | null;
  isConnected: boolean;
  onlineUsers: Array<{ userID: string; socketID: string }>;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  onlineUsers: [],
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userID: string; socketID: string }>>([]);

  useEffect(() => {
    if (!user) {
      destroySocket();
      return;
    }

    const socket = getSocket();
    socket.connect();

    const handleConnect = () => {
      setIsConnected(true);
      socket.emit('addOnlineUser', user.id);
    };
    const handleDisconnect = () => setIsConnected(false);
    const handleOnlineUsers = (users: typeof onlineUsers) => setOnlineUsers(users);

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('getOnlineUsers', handleOnlineUsers);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('getOnlineUsers', handleOnlineUsers);
    };
  }, [user?.id]);

  return (
    <SocketContext.Provider value={{ socket: getSocket(), isConnected, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export const useSocketContext = () => useContext(SocketContext);
```

### `useSocketEvent` Hook (`src/hooks/useSocketEvent.ts`)
```typescript
import { useEffect } from 'react';
import { useSocketContext } from '@/providers/SocketProvider';
import type { ServerToClientEvents } from '@/types/socket';

export function useSocketEvent<K extends keyof ServerToClientEvents>(
  event: K,
  handler: ServerToClientEvents[K]
) {
  const { socket } = useSocketContext();

  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler as Parameters<typeof socket.on>[1]);
    return () => { socket.off(event, handler as Parameters<typeof socket.off>[1]); };
  }, [socket, event, handler]);
}
```

### `useSubjectRoom` Hook (`src/hooks/useSubjectRoom.ts`)
```typescript
export function useSubjectRoom(subjectId: string | undefined) {
  const { socket } = useSocketContext();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!socket || !subjectId || !user) return;
    socket.emit('joinSubject', { userID: user.id, subjectID: subjectId });
    return () => {
      socket.emit('leaveSubject', { userID: user.id, subjectID: subjectId });
    };
  }, [socket, subjectId, user?.id]);
}
```

## Acceptance Criteria
- [ ] Socket connects automatically when user is authenticated
- [ ] Socket disconnects when user signs out
- [ ] `addOnlineUser` is emitted on connect with user ID
- [ ] `useSocketEvent` registers and cleans up listeners correctly
- [ ] `useSubjectRoom` joins on mount and leaves on unmount
- [ ] `useChannelRoom` joins `subjectId_channelId` room on mount
- [ ] All event names are typed — TypeScript errors if invalid event name used
- [ ] Socket reconnects up to 5 times on unexpected disconnect
- [ ] Only one socket instance exists (singleton pattern)

## Testing Requirements
- **Unit tests (Vitest):**
  - Mock `socket.io-client` → verify `connect()` is called when user is set
  - Verify `destroySocket()` disconnects when user is null
  - `useSocketEvent`: verify listener is added on mount and removed on unmount
  - `useSubjectRoom`: verify `joinSubject` emitted on mount, `leaveSubject` on unmount
- **Manual QA:**
  - Open browser DevTools → Network → WS tab → verify WebSocket connection established after login
  - Open two browser tabs, login as two users → verify `onlineUsers` updates in both tabs

## Definition of Done
- Socket connects after authentication
- All event types are defined in `src/types/socket.ts`
- `useSocketEvent` and `useSubjectRoom` hooks work correctly
- Unit tests pass

## Risks / Notes
- Note the typo in backend event name: `attendace` (not `attendance`) — use this exact spelling in the event type definition
- The singleton pattern is important — multiple `io()` calls create multiple connections
- In Next.js App Router, `SocketProvider` must be a Client Component; place it in a client-side provider wrapper
- In development with React StrictMode, effects run twice — the cleanup function on `useSubjectRoom` must properly leave the room
