import { prisma } from '../lib/prisma';
import { documentRooms } from '../lib/documentRooms';
import {
  AuthenticatedWebSocket,
  OperationMessage,
  OperationPayload,
  ServerOperationMessage,
  OperationAckMessage,
  ErrorMessage,
} from '../types';
import { Role } from '@prisma/client';
export async function handleOperation(
  ws: AuthenticatedWebSocket,
  message: OperationMessage
): Promise<void> {
  try {
    const { documentId, operation } = message;

    if (!ws.userId) {
      sendError(ws, 'Not authenticated');
      return;
    }

    const documentUser = await prisma.documentUser.findFirst({
      where: {
        documentId,
        userId: ws.userId,
        role: { in: [Role.OWNER, Role.EDITOR] },
      },
    });

    if (!documentUser) {
      sendError(ws, 'Access denied. Only owners and editors can edit.');
      return;
    }

    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      sendError(ws, 'Document not found');
      return;
    }

    // Get current version from operations count
    const latestOperation = await prisma.operation.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
    });

    const currentVersion = latestOperation?.version ?? 0;
    const newVersion = currentVersion + 1;

    // Apply operation without strict version check (simpler approach)
    const newContent = applyOperation(document.content, operation);

    await prisma.$transaction([
      prisma.document.update({
        where: { id: documentId },
        data: { content: newContent },
      }),
      prisma.operation.create({
        data: {
          documentId,
          userId: ws.userId,
          type: operation.type,
          position: operation.position,
          content: operation.content,
          length: operation.length,
          version: newVersion,
        },
      }),
    ]);

    const ackMessage: OperationAckMessage = {
      type: 'operation_ack',
      version: newVersion,
    };
    ws.send(JSON.stringify(ackMessage));

    const broadcastOperation: OperationPayload = {
      ...operation,
      version: newVersion,
    };

    const operationMessage: ServerOperationMessage = {
      type: 'operation',
      userId: ws.userId,
      operation: broadcastOperation,
    };
    documentRooms.broadcastToOthers(documentId, ws.userId, operationMessage);
  } catch (error) {
    console.error('Operation error:', error);
    sendError(ws, 'Failed to apply operation');
  }
}

function applyOperation(content: string, operation: OperationPayload): string {
  const { type, position, content: opContent, length } = operation;

  switch (type) {
    case 'insert':
      if (opContent === undefined) return content;
      return content.slice(0, position) + opContent + content.slice(position);

    case 'delete':
      if (length === undefined) return content;
      return content.slice(0, position) + content.slice(position + length);

    case 'replace':
      if (opContent === undefined || length === undefined) return content;
      return content.slice(0, position) + opContent + content.slice(position + length);

    default:
      return content;
  }
}

function sendError(ws: AuthenticatedWebSocket, message: string): void {
  const errorMessage: ErrorMessage = { type: 'error', message };
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(errorMessage));
  }
}
