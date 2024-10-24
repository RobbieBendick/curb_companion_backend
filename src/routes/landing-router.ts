import express from 'express';
import { create } from '../controllers/landing';
const landingRouter = express.Router();

landingRouter.post('/create', create);

export default landingRouter;
