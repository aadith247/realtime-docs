"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleOperation = handleOperation;
const prisma_1 = require("../lib/prisma");
const documentRooms_1 = require("../lib/documentRooms");
const client_1 = require("@prisma/client");
async function handleOperation(ws, message) {
    try {
        const { documentId, operation } = message;
        if (!ws.userId) {
            sendError(ws, 'Not authenticated');
            return;
        }
        const documentUser = await prisma_1.prisma.documentUser.findFirst({
            where: {
                documentId,
                userId: ws.userId,
                role: { in: [client_1.Role.OWNER, client_1.Role.EDITOR] },
            },
        });
        if (!documentUser) {
            sendError(ws, 'Access denied. Only owners and editors can edit.');
            return;
        }
        const latestOperation = await prisma_1.prisma.operation.findFirst({
            where: { documentId },
            orderBy: { version: 'desc' },
        });
        const currentVersion = latestOperation?.version ?? 0;
        if (operation.version !== currentVersion) {
            sendError(ws, `Version mismatch. Expected ${currentVersion}, got ${operation.version}`);
            return;
        }
        const document = await prisma_1.prisma.document.findUnique({
            where: { id: documentId },
        });
        if (!document) {
            sendError(ws, 'Document not found');
            return;
        }
        const newContent = applyOperation(document.content, operation);
        const newVersion = currentVersion + 1;
        await prisma_1.prisma.$transaction([
            prisma_1.prisma.document.update({
                where: { id: documentId },
                data: { content: newContent },
            }),
            prisma_1.prisma.operation.create({
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
        const ackMessage = {
            type: 'operation_ack',
            version: newVersion,
        };
        ws.send(JSON.stringify(ackMessage));
        const broadcastOperation = {
            ...operation,
            version: newVersion,
        };
        const operationMessage = {
            type: 'operation',
            userId: ws.userId,
            operation: broadcastOperation,
        };
        documentRooms_1.documentRooms.broadcastToOthers(documentId, ws.userId, operationMessage);
    }
    catch (error) {
        console.error('Operation error:', error);
        sendError(ws, 'Failed to apply operation');
    }
}
function applyOperation(content, operation) {
    const { type, position, content: opContent, length } = operation;
    switch (type) {
        case 'insert':
            if (opContent === undefined)
                return content;
            return content.slice(0, position) + opContent + content.slice(position);
        case 'delete':
            if (length === undefined)
                return content;
            return content.slice(0, position) + content.slice(position + length);
        case 'replace':
            if (opContent === undefined || length === undefined)
                return content;
            return content.slice(0, position) + opContent + content.slice(position + length);
        default:
            return content;
    }
}
function sendError(ws, message) {
    const errorMessage = { type: 'error', message };
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(errorMessage));
    }
}
//# sourceMappingURL=operation.js.map