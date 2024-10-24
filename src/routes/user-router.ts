import express from 'express';
const userRouter = express.Router();

import {
  addFavoriteVendor,
  deleteFavoriteVendor,
  deleteUser,
  getAllReviews,
  getAllUsers,
  getUserProfile,
  saveLocation,
  unsaveLocation,
  updateImages,
  updateProfileImage,
  updateUser,
  updateUserDeviceToken,
  updateUserRoles,
} from '../controllers/user-controller';
import { formFieldsMiddleware } from '../middleware/form-fields';
import { verifyTokens } from '../middleware/jwt';

userRouter.get('/', getAllUsers);

userRouter.get('/:id', getUserProfile);

userRouter.patch('/:id', verifyTokens, updateUser);

userRouter.delete('/:id', verifyTokens, deleteUser);

userRouter.get('/:id/reviews', getAllReviews);

userRouter.post('/:id/favorites', verifyTokens, addFavoriteVendor);

userRouter.delete('/:id/favorites', verifyTokens, deleteFavoriteVendor);

userRouter.post('/:id/profile-image', verifyTokens, formFieldsMiddleware, updateProfileImage);

userRouter.post('/:id/images', verifyTokens, formFieldsMiddleware, updateImages);

userRouter.patch('/:id/update-device-token', verifyTokens, updateUserDeviceToken);

userRouter.patch('/:id/update-roles', verifyTokens, updateUserRoles);

userRouter.patch('/:id/save-location', verifyTokens, saveLocation);

userRouter.patch('/:id/unsave-location', verifyTokens, unsaveLocation);

export default userRouter;
