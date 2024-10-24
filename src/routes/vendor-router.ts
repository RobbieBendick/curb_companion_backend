import express from 'express';
import {
  createOccurrence,
  createReview,
  createVendor,
  deleteOccurrence,
  deleteReview,
  deleteVendor,
  endLive,
  findVendor,
  findVendorsFromOwner,
  getAllReviews,
  getVendor,
  goLive,
  updateImages,
  updateMenuItemImage,
  updateProfileImage,
  updateVendor,
} from '../controllers/vendor-controller';
import { formFieldsMiddleware } from '../middleware/form-fields';
import { verifyTokens } from '../middleware/jwt';
const vendorRouter = express.Router();

vendorRouter.get('/search', findVendor);

vendorRouter.get('/search/owner/:ownerId', verifyTokens, findVendorsFromOwner);

vendorRouter.get('/:id', getVendor);

vendorRouter.post('/create', verifyTokens, formFieldsMiddleware, createVendor);

vendorRouter.patch('/:id', verifyTokens, formFieldsMiddleware, updateVendor);

vendorRouter.delete('/:id', verifyTokens, deleteVendor);

vendorRouter.post('/:id/go-live', verifyTokens, goLive);

vendorRouter.post('/:id/end-live', verifyTokens, endLive);

vendorRouter.post('/:id/schedule/occurrences', verifyTokens, createOccurrence);

vendorRouter.delete('/:id/schedule/occurences/:occurrenceID', verifyTokens, deleteOccurrence);

vendorRouter.post('/:id/profile-image', verifyTokens, formFieldsMiddleware, updateProfileImage);

vendorRouter.post('/:id/images', verifyTokens, formFieldsMiddleware, updateImages);

vendorRouter.post('/:id/menuitems/:id2/image', verifyTokens, formFieldsMiddleware, updateMenuItemImage);

vendorRouter.get('/:id/reviews', getAllReviews);

vendorRouter.post('/:id/reviews', verifyTokens, createReview);

vendorRouter.delete('/:id/reviews', verifyTokens, deleteReview);

export default vendorRouter;
