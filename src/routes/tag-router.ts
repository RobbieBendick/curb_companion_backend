import express from 'express';
import { createTag, getAllTags, updateTagsImage } from '../controllers/tag-controller';
import { formFieldsMiddleware } from '../middleware/form-fields';
import { verifyTokens } from '../middleware/jwt';
const tagRouter = express.Router();

tagRouter.post('/create', verifyTokens, createTag);

tagRouter.post('/:id/image', verifyTokens, formFieldsMiddleware, updateTagsImage);

tagRouter.get('/', getAllTags);

export default tagRouter;
