"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleJoinDocument = handleJoinDocument;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../lib/prisma");
const documentRooms_1 = require("../lib/documentRooms");
async function handleJoinDocument(ws, message) {
    try {
        const { documentId, token } = message;
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            sendError(ws, 'Server configuration error');
            return;
        }
        let payload;
        try {
            //@ts-ignore
            payload = jsonwebtoken_1.default.verify(token, secret);
        }
        catch {
            sendError(ws, 'Invalid or expired token');
            ws.close();
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, name: true },
        });
        if (!user) {
            sendError(ws, 'User not found');
            ws.close();
            return;
        }
        const documentUser = await prisma_1.prisma.documentUser.findFirst({
            where: {
                documentId,
                userId: user.id,
            },
        });
        if (!documentUser) {
            sendError(ws, 'Access denied to this document');
            return;
        }
        const document = await prisma_1.prisma.document.findUnique({
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
        documentRooms_1.documentRooms.joinRoom(documentId, ws, user.id, user.name);
        const users = documentRooms_1.documentRooms.getRoomUsers(documentId);
        const joinedMessage = {
            type: 'document_joined',
            documentId,
            content: document.content,
            version: currentVersion,
            users,
        };
        ws.send(JSON.stringify(joinedMessage));
        const userJoinedMessage = {
            type: 'user_joined',
            userId: user.id,
            name: user.name,
        };
        documentRooms_1.documentRooms.broadcastToOthers(documentId, user.id, userJoinedMessage);
    }
    catch (error) {
        console.error('Join document error:', error);
        sendError(ws, 'Failed to join document');
    }
}
function sendError(ws, message) {
    const errorMessage = { type: 'error', message };
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(errorMessage));
    }
}
//# sourceMappingURL=joinDocument.js.map