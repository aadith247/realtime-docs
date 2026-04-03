import 'dotenv/config';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { prisma } from './lib/prisma';

const PORT = parseInt(process.env.PORT || '3002', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface User {
  ws: WebSocket;
  odId: string;
  odName: string;
  rooms: string[];
}

const users: User[] = [];

function checkToken(token: string): string | null {
  try {
    //@ts-ignore
    const decoded = jwt.verify(token, JWT_SECRET);
    //@ts-ignore
    if (!decoded || !decoded.userId) {
      return null;
    }
    //@ts-ignore
    return decoded.userId;
  } catch (e) {
    return null;
  }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`WebSocket server running on port ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
  console.log('New client connected');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log('Received:', message);

      if (message.type === 'join') {
        await handleJoin(ws, message);
      } else if (message.type === 'chat') {
        await handleChat(ws, message);
      }
    } catch (error) {
      console.error('Error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  });

  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

async function handleJoin(ws: WebSocket, message: any) {
  const { docId, token } = message;

  if (!docId || !token) {
    ws.send(JSON.stringify({ type: 'error', message: 'Missing docId or token' }));
    return;
  }

  const odId = checkToken(token);
  if (!odId) {
    ws.send(JSON.stringify({ type: 'error', message: 'Invalid token' }));
    return;
  }

  // Check document access
  const docUser = await prisma.documentUser.findFirst({
    where: { documentId: docId, userId: odId },
    include: { user: true, document: true }
  });

  if (!docUser) {
    ws.send(JSON.stringify({ type: 'error', message: 'Access denied' }));
    return;
  }

  // Check if user already exists
  let user = users.find(u => u.ws === ws);
  if (user) {
    // Add room to existing user
    if (!user.rooms.includes(docId)) {
      user.rooms.push(docId);
    }
  } else {
    // Add new user
    users.push({
      ws,
      odId,
      odName: docUser.user.name,
      rooms: [docId]
    });
  }

  console.log(`User ${docUser.user.name} joined doc ${docId}. Total users: ${users.length}`);

  // Send current doc content
  ws.send(JSON.stringify({
    type: 'joined',
    docId,
    content: docUser.document.content
  }));

  // Notify others in the room
  users.forEach(u => {
    if (u.rooms.includes(docId) && u.ws !== ws && u.ws.readyState === WebSocket.OPEN) {
      u.ws.send(JSON.stringify({
        type: 'user_joined',
        odId,
        odName: docUser.user.name
      }));
    }
  });
}

async function handleChat(ws: WebSocket, message: any) {
  const user = users.find(u => u.ws === ws);
  if (!user) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not joined. Send join first.' }));
    return;
  }

  const { docId, content } = message;

  if (!docId || content === undefined) {
    ws.send(JSON.stringify({ type: 'error', message: 'Missing fields' }));
    return;
  }

  // Save to DB
  await prisma.document.update({
    where: { id: docId },
    data: { content }
  });

  console.log(`Edit in ${docId} by ${user.odName}`);

  // Broadcast to OTHER users in the room (exclude sender)
  users.forEach(u => {
    if (u.rooms.includes(docId) && u.ws !== ws && u.ws.readyState === WebSocket.OPEN) {
      u.ws.send(JSON.stringify({
        type: 'chat',
        docId,
        content
      }));
    }
  });
}

function handleDisconnect(ws: WebSocket) {
  const userIndex = users.findIndex(u => u.ws === ws);
  if (userIndex !== -1) {
    const user = users[userIndex];
    console.log(`User ${user.odName} disconnected`);
    
    // Notify rooms
    user.rooms.forEach(docId => {
      users.forEach(u => {
        if (u.rooms.includes(docId) && u.ws !== ws && u.ws.readyState === WebSocket.OPEN) {
          u.ws.send(JSON.stringify({
            type: 'user_left',
            odId: user.odId
          }));
        }
      });
    });

    users.splice(userIndex, 1);
  }
}
