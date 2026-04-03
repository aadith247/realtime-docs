import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { documentRooms } from '../lib/documentRooms';
import {
  AuthenticatedWebSocket,
  JwtPayload,
  JoinDocumentMessage,
  DocumentJoinedMessage,
  UserJoinedMessage,
  ErrorMessage,
} from '../types';

export async function handleJoinDocument(
  ws: AuthenticatedWebSocket,
  message: JoinDocumentMessage
): Promise<void> {
  try {
    const { documentId, token } = message;

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      sendError(ws, 'Server configuration error');
      return;
    }

    let payload: JwtPayload;
    try {
      //@ts-ignore
      payload = jwt.verify(token, secret);
    } catch {
      sendError(ws, 'Invalid or expired token');
      ws.close();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, name: true },
    });

    if (!user) {
      sendError(ws, 'User not found');
      ws.close();
      return;
    }

    const documentUser = await prisma.documentUser.findFirst({
      where: {
        documentId,
        userId: user.id,
      },

    });

    if (!documentUser) {
      sendError(ws, 'Access denied to this document');
      return;
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        operations: {
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });

    if (!document) {
      sendError(ws, 'Document not found');
      return;
    }
    
    ws.userId = user.id;
    ws.userName = user.name;
    const currentVersion = document.operations.length > 0 
      ? document.operations[0].version 
      : 0;

    documentRooms.joinRoom(documentId, ws, user.id, user.name);

    const users = documentRooms.getRoomUsers(documentId);

    const joinedMessage: DocumentJoinedMessage = {
      type: 'document_joined',
      documentId,
      content: document.content,
      version: currentVersion,
      users,
    };
    ws.send(JSON.stringify(joinedMessage));
    const userJoinedMessage: UserJoinedMessage = {
      type: 'user_joined',
      userId: user.id,
      name: user.name,
    };
    documentRooms.broadcastToOthers(documentId, user.id, userJoinedMessage);
  } catch (error) {
    console.error('Join document error:', error);
    sendError(ws, 'Failed to join document');
  }
}

function sendError(ws: AuthenticatedWebSocket, message: string): void {
  const errorMessage: ErrorMessage = { type: 'error', message };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(errorMessage));
  }
}
