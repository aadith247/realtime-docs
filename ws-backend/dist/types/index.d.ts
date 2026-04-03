import WebSocket from 'ws';
export interface JwtPayload {
    userId: string;
    email: string;
}
export interface ActiveUser {
    id: string;
    name: string;
    cursor: number | null;
}
export interface AuthenticatedWebSocket extends WebSocket {
    userId?: string;
    userName?: string;
    documentId?: string;
    isAlive?: boolean;
}
export interface OperationPayload {
    type: 'insert' | 'delete' | 'replace';
    position: number;
    content?: string;
    length?: number;
    version: number;
}
export interface JoinDocumentMessage {
    type: 'join_document';
    documentId: string;
    token: string;
}
export interface OperationMessage {
    type: 'operation';
    documentId: string;
    operation: OperationPayload;
}
export interface CursorUpdateMessage {
    type: 'cursor_update';
    documentId: string;
    position: number;
}
export interface LeaveDocumentMessage {
    type: 'leave_document';
    documentId: string;
}
export type ClientMessage = JoinDocumentMessage | OperationMessage | CursorUpdateMessage | LeaveDocumentMessage;
export interface DocumentJoinedMessage {
    type: 'document_joined';
    documentId: string;
    content: string;
    version: number;
    users: ActiveUser[];
}
export interface ServerOperationMessage {
    type: 'operation';
    userId: string;
    operation: OperationPayload;
}
export interface OperationAckMessage {
    type: 'operation_ack';
    version: number;
}
export interface ServerCursorUpdateMessage {
    type: 'cursor_update';
    userId: string;
    position: number;
}
export interface UserJoinedMessage {
    type: 'user_joined';
    userId: string;
    name: string;
}
export interface UserLeftMessage {
    type: 'user_left';
    userId: string;
}
export interface ErrorMessage {
    type: 'error';
    message: string;
}
export type ServerMessage = DocumentJoinedMessage | ServerOperationMessage | OperationAckMessage | ServerCursorUpdateMessage | UserJoinedMessage | UserLeftMessage | ErrorMessage;
//# sourceMappingURL=index.d.ts.map