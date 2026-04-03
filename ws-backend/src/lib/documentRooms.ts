import { AuthenticatedWebSocket, ActiveUser } from '../types';

interface RoomUser {
  ws: AuthenticatedWebSocket;
  userId: string;
  name: string;
  cursor: number | null;
}

class DocumentRooms {
  //@ts-ignore
  private rooms = new Map();
  joinRoom(documentId: string, ws: AuthenticatedWebSocket, userId: string, name: string): void {
    if (!this.rooms.has(documentId)) {
      this.rooms.set(documentId, new Map()); }
    const room = this.rooms.get(documentId)!;
    room.set(userId, { ws, userId, name, cursor: null });
    ws.documentId = documentId;
  }

  leaveRoom(documentId: string, userId: string): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    room.delete(userId);

    if (room.size === 0) {
      this.rooms.delete(documentId);
    }
  }

  leaveAllRooms(ws: AuthenticatedWebSocket): string[] {
    const leftRooms: string[] = [];
    this.rooms.forEach((room, documentId) => {
      room.forEach((user:any, userId:any) => {
        if (user.ws === ws) {
          room.delete(userId);
          leftRooms.push(documentId);
        }
      });

      if (room.size === 0) {
        this.rooms.delete(documentId);
      }
    });
    return leftRooms;
  }

  updateCursor(documentId: string, userId: string, position: number): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    const user = room.get(userId);
    if (user) {
      user.cursor = position;
    }
  }

  broadcastToRoom(documentId: string, message: object): void {
    const room = this.rooms.get(documentId);
    if (!room) return;
    const messageStr = JSON.stringify(message);
    room.forEach((user:any) => {
      if (user.ws.readyState === user.ws.OPEN) {
        user.ws.send(messageStr);
      }
    });
  }

  broadcastToOthers(documentId: string, excludeUserId: string, message: object): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    const messageStr = JSON.stringify(message);

    room.forEach((user:any) => {
      if (user.userId !== excludeUserId && user.ws.readyState === user.ws.OPEN) {
        user.ws.send(messageStr);
      }
    });
  }

  sendToUser(documentId: string, userId: string, message: object): void {
    const room = this.rooms.get(documentId);
    if (!room) return;

    const user = room.get(userId);
    if (user && user.ws.readyState === user.ws.OPEN) {
      user.ws.send(JSON.stringify(message));
    }
  }

  getRoomUsers(documentId: string): ActiveUser[] {
    const room = this.rooms.get(documentId);
    if (!room) return [];

    return Array.from(room.values()).map((user:any) => ({
      id: user.userId,
      name: user.name,
      cursor: user.cursor,
    }));
  }

  isUserInRoom(documentId: string, userId: string): boolean {
    const room = this.rooms.get(documentId);
    return room?.has(userId) ?? false;
  }
}

export const documentRooms = new DocumentRooms();
