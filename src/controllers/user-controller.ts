import { PutBucketEncryptionRequestFilterSensitiveLog, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Request, Response } from 'express';
import fs from 'fs';
import { AWS_S3_BUCKET_URI } from '../config/constants';
import { getUserID } from '../middleware/jwt';
import Image from '../models/image-model';
import { createILocation } from '../models/location-schema';
import Review from '../models/review-model';
import User from '../models/user-model';
import Vendor from '../models/vendor-model';
import { deepEquals } from '../shared/helpers/helpers';
import { ErrorResponse, ResponseInfo, sendErrorResponse, sendResponse } from '../shared/helpers/response';
import IImage from '../shared/interfaces/image';
import ILocation from '../shared/interfaces/location';
import { UserRoles } from '../shared/interfaces/user-roles';

const baseNamespace: string = 'user-controller';

export async function getAllUsers(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.getAllUsers`;
  try {
    const users = await User.find({}).exec();
    if (!users || users.length === 0) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.usersNotFound });
    } else {
      return sendResponse({ req, res, namespace, ...ResponseInfo.usersFound, data: users });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function getUserProfile(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.getUserProfile`;
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    } else {
      return sendResponse({ req, res, namespace, ...ResponseInfo.userFound, data: user });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateUserRoles(req: Request, res: Response) {
  const namespace: string = '${baseNamespace}.updateUserRole';

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const request_user = await User.findById(getUserID(req));
    if (!request_user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    if (!request_user.roles.includes(UserRoles.ADMIN)) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    let added_roles = [];
    if (req.body.roles.length > 0) {
      req.body.role.forEach((role: string) => {
        if ((<any>Object).values(UserRoles).includes(role) && !user.roles.includes(role)) {
          user.roles.push(role);
          added_roles.push(role);
        }
      });
    }

    if (added_roles.length > 0) {
      return sendResponse({ req, res, namespace, ...ResponseInfo.userUpdated, data: user });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userUpdateFailed });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateUserDeviceToken(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateUserDeviceToken`;
  // TODO: Request validation

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    if (req.body.deviceToken !== undefined && req.body.deviceToken !== null && req.body.deviceToken !== '') {
      user.deviceToken = req.body.deviceToken;
      await user.save();
      return sendResponse({ req, res, namespace, ...ResponseInfo.deviceTokenUpdated, data: user });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.deviceTokenInvalid });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function saveLocation(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.saveLocation`;
  try {
    if (`${getUserID(req)}` !== req.params.id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const locationObj: ILocation | undefined = await createILocation(req.body.location);
    if (locationObj === undefined) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.locationRequired });
    }

    const locationSaved = await user?.saveLocation(locationObj);
    if (!locationSaved) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.locationAlreadySaved });
    }

    await user.save();

    return sendResponse({ req, res, namespace, ...ResponseInfo.locationSaved, data: user });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function unsaveLocation(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.unsaveLocation`;
  try {
    if (`${getUserID(req)}` !== req.params.id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const locationObj: ILocation | undefined = await createILocation(req.body.location);
    if (locationObj === undefined) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.locationRequired });
    }

    const userLocationSaved = await user.unsaveLocation(locationObj);
    if (userLocationSaved) {
      await user.save();
      return sendResponse({ req, res, namespace, ...ResponseInfo.locationUnsaved, data: user });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.locationNotFound });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateUser(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateUser`;
  try {
    // TODO: Interface & Validation
    if (`${getUserID(req)}` !== req.params.id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    // TODO: Update other fields
    const firstName = req.body.firstName;
    if (firstName) {
      user.firstName = firstName;
    }
    if (req.body.surname) {
      user.surname = req.body.surname;
    }
    if (req.body.location) {
      const locationObj: ILocation | undefined = await createILocation(req.body.location);
      const tmpLocation = user.location;

      user.unsaveLocation(locationObj!);
      user.location = locationObj;
      user.saveLocation(tmpLocation!);
    }

    await user.save();

    return sendResponse({ req, res, namespace, ...ResponseInfo.userUpdated, data: user });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function getAllReviews(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.getAllReviews`;
  try {
    const reviews = await Review.find({ userId: req.params.id });
    if (reviews.length === 0) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.reviewsNotFound });
    } else {
      return sendResponse({ req, res, namespace, ...ResponseInfo.reviewsFound, data: reviews });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function addFavoriteVendor(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.addFavoriteVendor`;
  try {
    if (`${getUserID(req)}` !== req.params.id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    // Try to find the Vendor from the Vendor's ID.
    const vendor = await Vendor.findById(req.body.vendorId);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    } else if (user.favorites.includes(vendor._id)) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorAlreadyFavorited });
    } else {
      // Add the Vendor to the User's favorites.
      user.favorites.push(vendor._id);
      // Increment the Vendor's favorites count.
      vendor.favorites++;
      await user.save();
      await vendor.save();

      return sendResponse({ req, res, namespace, ...ResponseInfo.vendorFavorited, data: user });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function deleteFavoriteVendor(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.deleteFavoriteVendor`;
  try {
    if (`${getUserID(req)}` !== req.params.id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }
    let user = await User.findById(req.params.id);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    // Try to find the Vendor from the Vendor's ID.
    const vendor = await Vendor.findById(req.body.vendorId);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    // Check if the Vendor is in the User's favorites.
    else if (!user.favorites.includes(vendor._id)) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFavorited });
    } else {
      // Remove the Vendor from the User's favorites.
      if (user.favorites.includes(vendor._id)) {
        let index = user.favorites.indexOf(vendor._id.toString());
        user.favorites.splice(index, 1);
      }

      // Decrement the Vendor's favorites count.
      vendor.favorites--;
      await vendor.save();
      await user.save();

      return sendResponse({ req, res, namespace, ...ResponseInfo.vendorUnfavorited, data: user });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

// TODO: Refactor
export async function updateProfileImage(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateProfileImage`;
  try {
    const userId = getUserID(req);
    if (!userId || userId.toString() !== req.params.id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    if (!req.files || !req.files.image) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.noFilesUploaded });
    }

    const image: any = req.files.image;
    const imageName = image.originalFilename;
    const imageParts = imageName.split('.');
    let minImageName = image.newFilename;
    let newImageName = minImageName;
    let imageType;

    if (imageParts.includes('jpg') || imageParts.includes('jpeg') || imageParts.includes('png')) {
      imageType = imageParts.pop();
      newImageName = `${newImageName}.${imageType}`;
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidImageType });
    }

    const fileStream = fs.createReadStream(image.filepath);
    const partialImageURL = `images/users/${userId}/${newImageName}`;

    const bucketParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: partialImageURL,
      Body: fileStream,
    };
    const s3Client = new S3Client({
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_IAM_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_S3_IAM_SECRET_ACCESS_KEY as string,
      },
    });

    const data = await s3Client.send(new PutObjectCommand(bucketParams));

    while (await Image.findOne({ name: newImageName })) {
      function randomizeString(originalString: string) {
        var randomizedString = '';
        for (var i = 0; i < originalString.length; i++) {
          var randomHexDigit = Math.floor(Math.random() * 16).toString(16);
          randomizedString += randomHexDigit;
        }
        return randomizedString;
      }
      newImageName = `${newImageName}.${randomizeString(minImageName)}`;
    }

    const newImage = await Image.create({
      name: newImageName,
      imageURL: `${AWS_S3_BUCKET_URI}${partialImageURL}`,
      owner: user.id,
      ownerType: 'User',
      uploader: user._id,
    });

    user.profileImage = newImage;
    await user.save();

    if (data.$metadata.httpStatusCode === 200) {
      return sendResponse({ req, res, namespace, ...ResponseInfo.userUpdated, data: user });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userUpdateFailed });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function deleteUser(req: Request, res: Response) {
  const namespace = `${baseNamespace}.deleteUser`;
  try {
    const params = req.body;

    const userId = getUserID(req);
    if (!userId || userId.toString() !== req.params.id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    const user = await User.findOne({ email: params.email });
    if (user) {
      return sendErrorResponse({ req, res, ...ErrorResponse.emailInUse, namespace });
    }

    User.deleteOne({ _id: userId }, (err) => {
      if (err) {
        return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: err });
      }
    });
    return sendResponse({ req, res, namespace, ...ResponseInfo.accountDeleted });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateImages(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateImages`;
  try {
    const userId = getUserID(req);
    if (!userId || userId.toString() !== req.params.id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    if (!req.files || !req.files.image) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.noFilesUploaded });
    }

    const image: any = req.files.image;
    const imageName = image.originalFilename;
    const imageParts = imageName.split('.');
    let minImageName = image.newFilename;
    let newImageName = minImageName;
    let imageType;

    if (imageParts.includes('jpg') || imageParts.includes('jpeg') || imageParts.includes('png')) {
      imageType = imageParts.pop();
      newImageName = `${newImageName}.${imageType}`;
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidImageType });
    }

    const fileStream = fs.createReadStream(image.filepath);
    const partialImageURL = `images/users/${userId}/${newImageName}`;

    const bucketParams = {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: partialImageURL,
      Body: fileStream,
    };
    const s3Client = new S3Client({
      region: process.env.AWS_S3_REGION,
      credentials: {
        accessKeyId: process.env.AWS_S3_IAM_ACCESS_KEY as string,
        secretAccessKey: process.env.AWS_S3_IAM_SECRET_ACCESS_KEY as string,
      },
    });

    const data = await s3Client.send(new PutObjectCommand(bucketParams));

    while (await Image.findOne({ name: newImageName })) {
      function randomizeString(originalString: string) {
        var randomizedString = '';
        for (var i = 0; i < originalString.length; i++) {
          var randomHexDigit = Math.floor(Math.random() * 16).toString(16);
          randomizedString += randomHexDigit;
        }
        return randomizedString;
      }
      newImageName = `${newImageName}.${randomizeString(minImageName)}`;
    }

    const newImage = await Image.create({
      name: newImageName,
      imageURL: `https://curbcompanion-dev.s3.amazonaws.com/${partialImageURL}`,
      owner: user.id,
      ownerType: 'User',
      uploader: user._id,
    });

    user.images.push(newImage.toJSON() as IImage);
    await user.save();

    if (data.$metadata.httpStatusCode === 200) {
      return sendResponse({ req, res, namespace, ...ResponseInfo.userUpdated, data: user });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userUpdateFailed });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
