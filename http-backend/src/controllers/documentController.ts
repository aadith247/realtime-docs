import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

export const createDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { title } = req.body;

    const document = await prisma.document.create({
      data: {
        title: title || 'Untitled Document',
        ownerId: req.user.userId,
        users: {
          create: {
            userId: req.user.userId,
            role: Role.OWNER,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, photo: true },
        },
        users: {
          include: {
            user: {
              select: { id: true, email: true, name: true, photo: true },
            },
          },
        },
      },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listDocuments = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const documents = await prisma.document.findMany({
      where: {
        users: {
          some: {
            userId: req.user.userId,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, photo: true },
        },
        users: {
          include: {
            user: {
              select: { id: true, email: true, name: true, photo: true },
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    res.json(documents);
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id,
        users: {
          some: {
            userId: req.user.userId,
          },
        },
      },
      include: {
        owner: {
          select: { id: true, email: true, name: true, photo: true },
        },
        users: {
          include: {
            user: {
              select: { id: true, email: true, name: true, photo: true },
            },
          },
        },
        operations: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!document) {
      res.status(404).json({ error: 'Document not found or access denied' });
      return;
    }

    res.json(document);
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { title, content } = req.body;

    const documentUser = await prisma.documentUser.findFirst({
      where: {
        documentId: id,
        userId: req.user.userId,
        role: { in: [Role.OWNER, Role.EDITOR] },
      },
    });

    if (!documentUser) {
      res.status(403).json({ error: 'Access denied. Only owners and editors can update documents.' });
      return;
    }

    const updateData: { title?: string; content?: string } = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;

    const document = await prisma.document.update({
      where: { id },
      data: updateData,
      include: {
        owner: {
          select: { id: true, email: true, name: true, photo: true },
        },
        users: {
          include: {
            user: {
              select: { id: true, email: true, name: true, photo: true },
            },
          },
        },
      },
    });

    res.json(document);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id,
        ownerId: req.user.userId,
      },
    });

    if (!document) {
      res.status(403).json({ error: 'Access denied. Only the owner can delete the document.' });
      return;
    }

    await prisma.document.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const shareDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { email, role } = req.body;

    if (!email || !role) {
      res.status(400).json({ error: 'Email and role are required' });
      return;
    }

    if (!Object.values(Role).includes(role)) {
      res.status(400).json({ error: 'Invalid role. Must be OWNER, EDITOR, or VIEWER' });
      return;
    }

    const document = await prisma.document.findFirst({
      where: {
        id,
        ownerId: req.user.userId,
      },
    });

    if (!document) {
      res.status(403).json({ error: 'Access denied. Only the owner can share the document.' });
      return;
    }

    const userToShare = await prisma.user.findUnique({
      where: { email },
    });

    if (!userToShare) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (userToShare.id === req.user.userId) {
      res.status(400).json({ error: 'Cannot share document with yourself' });
      return;
    }

    const documentUser = await prisma.documentUser.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId: userToShare.id,
        },
      },
      update: { role },
      create: {
        documentId: id,
        userId: userToShare.id,
        role,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, photo: true },
        },
      },
    });

    res.status(201).json(documentUser);
  } catch (error) {
    console.error('Share document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const removeCollaborator = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id, userId } = req.params;

    const document = await prisma.document.findFirst({
      where: {
        id,
        ownerId: req.user.userId,
      },
    });

    if (!document) {
      res.status(403).json({ error: 'Access denied. Only the owner can remove collaborators.' });
      return;
    }

    if (userId === req.user.userId) {
      res.status(400).json({ error: 'Cannot remove yourself from your own document' });
      return;
    }

    const documentUser = await prisma.documentUser.findFirst({
      where: {
        documentId: id,
        userId,
      },
    });

    if (!documentUser) {
      res.status(404).json({ error: 'Collaborator not found' });
      return;
    }

    await prisma.documentUser.delete({
      where: { id: documentUser.id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
