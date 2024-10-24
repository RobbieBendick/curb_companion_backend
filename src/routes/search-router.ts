import express from 'express';
import { autocomplete } from '../controllers/search-controller';
const searchRouter = express.Router();

searchRouter.get('/autocomplete', autocomplete);

export default searchRouter;
