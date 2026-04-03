# realtime-docs
A real-time collaborative text editor built with TypeScript, WebSockets, Prisma, and CRDT (RGA algorithm) for conflict-free simultaneous editing.

# Collaborative Text Editor

A real-time collaborative text editor like Google Docs, built from scratch with TypeScript. Multiple users can edit the same document simultaneously without conflicts, powered by a CRDT (RGA) algorithm.

---

## Features

- Real-time collaborative editing using WebSockets
- Conflict-free simultaneous edits using CRDT (RGA algorithm)
- JWT-based authentication
- Role-based access control (Owner / Editor / Viewer)
- Document sharing with other users
- Persistent storage with PostgreSQL via Prisma

---

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript |
| HTTP Server | Express.js |
| WebSocket Server | ws (native) |
| Database | PostgreSQL |
| ORM | Prisma |
| Auth | JWT + bcryptjs |
| CRDT Algorithm | RGA (Replicated Growable Array) |

---

## Project Structure

<img width="2142" height="1252" alt="Screenshot 2026-04-03 at 6 24 17 PM" src="https://github.com/user-attachments/assets/53c4c5d4-0b1f-4b9c-aaf7-002546078ee7" />


