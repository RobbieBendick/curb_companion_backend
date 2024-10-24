import express from 'express';
import { generateHomeSections } from '../controllers/home-controller';
const homeRouter = express.Router();

homeRouter.get('/sections', generateHomeSections);

export default homeRouter;
