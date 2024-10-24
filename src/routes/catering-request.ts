import express from 'express';
import { createCateringRequest } from '../controllers/catering-controller';
const cateringRouter = express.Router();

cateringRouter.post('/create-catering-request', createCateringRequest);

export default cateringRouter;
