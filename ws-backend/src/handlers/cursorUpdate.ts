import { documentRooms } from '../lib/documentRooms';
import {
  AuthenticatedWebSocket,
  CursorUpdateMessage,
  ServerCursorUpdateMessage,
  ErrorMessage,
} from '../types';

export function handleCursorUpdate(
  ws: AuthenticatedWebSocket,
  message: CursorUpdateMessage
): void {
  try 
{
  const { documentId, position } = message;
    if(!ws.userId){ sendError(ws, 'Not authenticated'); return; }
    documentRooms.updateCursor(documentId, ws.userId, position);
    const cursorMessage: ServerCursorUpdateMessage = {
      type: 'cursor_update', userId: ws.userId, position, };
    documentRooms.broadcastToOthers(documentId, ws.userId, cursorMessage);
  }catch(error){
    console.error('Cursor update error:', error);
    sendError(ws, 'Failed to update cursor');
  }
}

function sendError(ws: AuthenticatedWebSocket, message: string): void {
  const errorMessage: ErrorMessage = { type: 'error', message };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(errorMessage));
  }
}
