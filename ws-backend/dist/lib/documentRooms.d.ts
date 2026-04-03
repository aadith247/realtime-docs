import { AuthenticatedWebSocket, ActiveUser } from '../../src/types';
declare class DocumentRooms {
    private rooms;
    joinRoom(documentId: string, ws: AuthenticatedWebSocket, userId: string, name: string): void;
    leaveRoom(documentId: string, userId: string): void;
    leaveAllRooms(ws: AuthenticatedWebSocket): string[];
    updateCursor(documentId: string, userId: string, position: number): void;
    broadcastToRoom(documentId: string, message: object): void;
    broadcastToOthers(documentId: string, excludeUserId: string, message: object): void;
    sendToUser(documentId: string, userId: string, message: object): void;
    getRoomUsers(documentId: string): ActiveUser[];
    isUserInRoom(documentId: string, userId: string): boolean;
}
export declare const documentRooms: DocumentRooms;
export {};
//# sourceMappingURL=documentRooms.d.ts.map