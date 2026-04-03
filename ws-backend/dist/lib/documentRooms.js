"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.documentRooms = void 0;
class DocumentRooms {
    constructor() {
        //@ts-ignore
        this.rooms = new Map();
    }
    joinRoom(documentId, ws, userId, name) {
        if (!this.rooms.has(documentId)) {
            this.rooms.set(documentId, new Map());
        }
        const room = this.rooms.get(documentId);
        room.set(userId, { ws, userId, name, cursor: null });
        ws.documentId = documentId;
    }
    leaveRoom(documentId, userId) {
        const room = this.rooms.get(documentId);
        if (!room)
            return;
        room.delete(userId);
        if (room.size === 0) {
            this.rooms.delete(documentId);
        }
    }
    leaveAllRooms(ws) {
        const leftRooms = [];
        //@ts-ignore
        this.rooms.forEach((room, documentId) => {
            //@ts-ignore
            room.forEach((user, odocumentId) => {
                if (user.ws === ws) {
                    room.delete(user.userId);
                    leftRooms.push(documentId);
                }
            });
            if (room.size === 0) {
                this.rooms.delete(documentId);
            }
        });
        return leftRooms;
    }
    updateCursor(documentId, userId, position) {
        const room = this.rooms.get(documentId);
        if (!room)
            return;
        const user = room.get(userId);
        if (user) {
            user.cursor = position;
        }
    }
    broadcastToRoom(documentId, message) {
        const room = this.rooms.get(documentId);
        if (!room)
            return;
        const messageStr = JSON.stringify(message);
        //@ts-ignore
        room.forEach((user) => {
            if (user.ws.readyState === user.ws.OPEN) {
                user.ws.send(messageStr);
            }
        });
    }
    broadcastToOthers(documentId, excludeUserId, message) {
        const room = this.rooms.get(documentId);
        if (!room)
            return;
        const messageStr = JSON.stringify(message);
        //@ts-ignore
        room.forEach((user) => {
            if (user.userId !== excludeUserId && user.ws.readyState === user.ws.OPEN) {
                user.ws.send(messageStr);
            }
        });
    }
    sendToUser(documentId, userId, message) {
        const room = this.rooms.get(documentId);
        if (!room)
            return;
        const user = room.get(userId);
        if (user && user.ws.readyState === user.ws.OPEN) {
            user.ws.send(JSON.stringify(message));
        }
    }
    getRoomUsers(documentId) {
        const room = this.rooms.get(documentId);
        if (!room)
            return [];
        //@ts-ignore
        return Array.from(room.values()).map((user) => ({
            //@ts-ignore
            id: user.userId,
            //@ts-ignore
            name: user.name,
            //@ts-ignore
            cursor: user.cursor,
        }));
    }
    isUserInRoom(documentId, userId) {
        const room = this.rooms.get(documentId);
        return room?.has(userId) ?? false;
    }
}
exports.documentRooms = new DocumentRooms();
//# sourceMappingURL=documentRooms.js.map