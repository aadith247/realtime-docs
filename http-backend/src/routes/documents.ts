import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import {
  createDocument,
  listDocuments,
  getDocument,
  updateDocument,
  deleteDocument,
  shareDocument,
  removeCollaborator,
} from '../controllers/documentController';

const router = Router();

router.use(authMiddleware);

router.post('/', createDocument);
router.get('/', listDocuments);
router.get('/:id', getDocument);
router.patch('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/share', shareDocument);
router.delete('/:id/share/:userId', removeCollaborator);

export default router;
