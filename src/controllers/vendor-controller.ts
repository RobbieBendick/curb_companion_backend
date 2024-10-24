import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Request, Response } from 'express';
import fs from 'fs';
import { PipelineStage } from 'mongoose';
import { AWS_S3_BUCKET_URI, DEFAULT_RADIUS_MILES, EARTH_RADIUS_MILES } from '../config/constants';
import { uploadImage, uploadProfileImage } from '../helpers/helpers';
import { getUserID } from '../middleware/jwt';
import Image from '../models/image-model';
import LiveHistory from '../models/live-history-model';
import Live from '../models/live-model';
import * as location_schema from '../models/location-schema';
import MenuItem from '../models/menu-item-model';
import Occurrence from '../models/occurrence-model';
import Review from '../models/review-model';
import User from '../models/user-model';
import Vendor from '../models/vendor-model';
import { distance } from '../shared/helpers/math';
import { ErrorResponse, ResponseInfo, sendErrorResponse, sendResponse } from '../shared/helpers/response';
import IImage from '../shared/interfaces/image';
import ILocation from '../shared/interfaces/location';
import IMenuItem from '../shared/interfaces/menu-item';
import { UserRoles } from '../shared/interfaces/user-roles';
import { CreateVendorRequest, VendorQuery } from '../shared/interfaces/vendor';
import { VendorValidation } from '../validations/vendor-validation';

// TODO: Refactor
const baseNamespace: string = 'vendor-controller';

export async function findVendor(req: Request, res: Response) {
  // TODO: Redo queries and shit
  const namespace: string = `${baseNamespace}.findVendor`;
  try {
    const params: VendorQuery = {
      ownerId: req.query.ownerId as string | undefined,
      tags: req.query.tags as string | undefined,
      lat: req.query.lat !== undefined ? Number(req.query.lat) : undefined,
      lon: req.query.lon !== undefined ? Number(req.query.lon) : undefined,
      radius: req.query.radius !== undefined ? Number(req.query.radius) : undefined,
      q: req.query.q as string | undefined,
      rating: req.query.rating !== undefined ? Number(req.query.rating) : undefined,
      catering: req.query.catering === 'true',
      skip: req.query.skip !== undefined ? Number(req.query.skip) : undefined,
      limit: req.query.limit !== undefined ? Number(req.query.limit) : undefined,
    };

    let { error } = VendorValidation.findVendor(params);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    let pipeline: any = [];

    const matchStage: {} = { $match: { $and: [] } };

    // NOTE: If we query title by any string starting with '$', query doesn't work (TODO: fix?)
    // Search by location && query
    let radius: number = DEFAULT_RADIUS_MILES;
    if (params.radius) {
      radius = Number(params.radius);
    }
    let locationQuery: any = {};
    if (params.lon && params.lat) {
      // Set the location query

      locationQuery = {
        location: {
          type: 'Point',
          coordinates: [Number(params.lon), Number(params.lat)],
        },
        radius: Number(radius),
      };

      // Push the location query
      pipeline = [
        {
          $geoNear: {
            near: locationQuery.location.coordinates,
            spherical: true,
            distanceField: 'distance',
            key: 'location',
            distanceMultiplier: EARTH_RADIUS_MILES,
            maxDistance: locationQuery.radius / EARTH_RADIUS_MILES,
          },
        },
        { $sort: { distance: 1 } },
      ];
    }

    let query: any = '';
    if (params.q) {
      query = params.q;
    }

    // Push the title query
    (matchStage as any).$match.$and.push({
      $or: [{ title: { $regex: query, $options: 'i' } }, { tags: { $regex: query, $options: 'i' } }],
    });

    // Check and push tags
    if (params.tags) {
      (matchStage as any).$match.$and.push({ 'tags.title': { $in: params.tags.split(',') } });
    }

    // Check and push catering
    if (params.catering) {
      (matchStage as any).$match.$and.push({ isCatering: params.catering });
    }

    // Check and push ratings
    if (params.rating) {
      (matchStage as any).$match.$and.push({ gte: ['$rating', params.rating] });
    }

    // Push our match/and stage
    if ((matchStage as any).$match.$and.length > 0) {
      (pipeline as any).push(matchStage);
    }

    // Check and push skip
    if (params.skip) {
      (pipeline as any).push({ $skip: params.skip });
    }

    // Check and push limit
    if (params.limit) {
      (pipeline as any).push({ $limit: params.limit });
    }

    // Aggregate finally
    let allVendors = await Vendor.aggregate(pipeline);

    // Using an aggregation does not return a mongoose model's virtual fields, so we need to hydrate the schemas to obtain our virtual fields.
    allVendors = allVendors.map((d) => {
      return d;
    });

    if (allVendors.length === 0) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.noVendorsFound });
    } else {
      return sendResponse({ req, res, namespace, ...ResponseInfo.vendorsFound, data: allVendors });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function getVendor(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.getVendor`;
  try {
    // Get vendor by ID.
    const vendor = await Vendor.findById(req.params.id).populate('tags');

    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    // Get user ID from token.
    // Check if there is a token.
    const token = req.headers['access-token'];
    if (token) {
      const userId = getUserID(req);

      // Get User by ID.
      const user = await User.findById(userId);
      if (user) {
        // Check if user is the ownerId of the vendor.
        if (userId !== vendor.ownerId) {
          // Check if user has the max amount of recently viewed vendors.
          if (user.recentlyViewedVendors.length === 10) {
            // Remove the oldest vendor.
            user.recentlyViewedVendors.pop();
          }

          // Check if vendor is already in recently viewed vendors.
          let i = user.recentlyViewedVendors.indexOf(vendor._id);
          // If so, remove it.
          if (i > -1) {
            user.recentlyViewedVendors.splice(i, 1);
          }
          // Add vendor to the beginning of recently viewed vendors.
          user.recentlyViewedVendors.unshift(vendor._id);

          // Update vendor views.
          vendor.views += 1;
        }
      }
    }

    await vendor.save();

    let vendorData: any = vendor.toJSON();

    for (let i = 0; i < vendorData.reviews.length; i++) {
      if (i == 0) {
        console.log(vendorData.reviews[i]);
      }
      const review = await Review.findById(vendorData.reviews[i]).populate('firstName').populate('surname').exec();

      if (i == 0) {
        console.log(review);
      }
      if (review) {
        vendorData.reviews[i] = review.toJSON();
      }
    }

    return sendResponse({ req, res, namespace, ...ResponseInfo.vendorFound, data: vendorData });
  } catch (error: any) {
    if (error.name === 'CastError') {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateVendor(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateVendor`;
  try {
    // Validate data.
    // const { error } = VendorValidation.update(req.body);
    // if (error) return res.status(400).send({ message: error.details[0].message });

    // Get userId from token.
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    // Check if vendor exists.
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    // Validate ownerId of vendor.
    if (vendor.ownerId?.toString() == user._id.toString() || user.roles.includes(UserRoles.ADMIN)) {
      // Check title update.
      const title = req.body.title;
      if (title) vendor.title = title;

      // Check email update.
      const email = req.body.email;
      if (email) vendor.email = email;

      // Check website update.
      const website = req.body.website;
      if (website) vendor.website = website;

      // Check phone update.
      const phoneNumber = req.body.phoneNumber;
      if (phoneNumber) vendor.phoneNumber = phoneNumber;

      // Check catering update.
      const catering = req.body.catering;
      if (catering) vendor.isCatering = catering;

      // Check description update.
      const description = req.body.description;
      if (description) vendor.description = description;

      // Check image update.
      // await checkImage(vendor, req, res);

      // await checkImages(vendor, req, res);

      // CHeck schedule update.
      if (req.body.schedule) {
        await vendor.updateSchedule(req.body.schedule);
      }

      // Check menu updates.
      if (req.body.menu) {
        await vendor.updateMenu(req.body.menu);
      }

      // Check tag updates.
      if (req.body.tags) {
        await vendor.updateTags(req.body.tags);
      }

      // Check location update.
      if (req.body.location) {
        await vendor.updateLocation(req.body.location);
      }
      await vendor.save();

      return sendResponse({ req, res, namespace, ...ResponseInfo.vendorUpdated, data: vendor });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function createVendor(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.createVendor`;
  try {
    const params: CreateVendorRequest = req.body;

    // Validate vendor.
    const { error } = VendorValidation.create(params);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }
    const userId = getUserID(req);
    const user = await User.findById(userId);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    params.ownerId = userId;

    // Same ownerId ID and same title - works if we don't have random submissions from users.
    // ->>> With random submissions from users we have to manually enter them.

    // Create a new vendor.
    // TODO: extend Vendor.create() to include menu, tags, location, schedule, images & more.
    const vendor = await Vendor.create({
      title: params.title,
      email: params.email,
      website: params.website,
      phoneNumber: params.phoneNumber,
      isCatering: params.isCatering,
      description: params.description,
    });

    if (req.files) {
      const route = `vendors/${vendor._id}`;
      const newImage = await uploadImage(req, res, user, vendor, route);
      if (newImage) vendor.images.push(newImage.toJSON() as IImage);

      const newProfileImage = await uploadProfileImage(req, res, user, vendor, route);
      if (newProfileImage) vendor.profileImage = newProfileImage.toJSON() as IImage;

      // TODO: upload multiple images. (Maybe?)
    }

    if (params.menu) {
      await vendor.updateMenu(params.menu);
    }

    if (params.tags) {
      await vendor.updateTags(params.tags);
    }

    if (params.location) {
      await vendor.updateLocation(params.location);
    }

    await vendor.save();

    return sendResponse({ req, res, namespace, ...ResponseInfo.vendorCreated, data: vendor });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function deleteVendor(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.deleteVendor`;
  try {
    const vendor = await Vendor.findOne({ _id: req.params.id });
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    if (vendor.ownerId?.toString() == user._id.toString() || user.roles.includes(UserRoles.ADMIN)) {
      await vendor.remove();
      return sendResponse({ req, res, namespace, ...ResponseInfo.vendorDeleted });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }
  } catch (error: any) {
    if (error.name === 'CastError') {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function getAllReviews(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.getAllReviews`;

  try {
    // Get vendor by ID
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    } else if (vendor.reviews.length === 0) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.reviewsNotFound });
    } else {
      return sendResponse({ req, res, namespace, ...ResponseInfo.reviewsFound, data: vendor.reviews });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function endLive(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.endLive`;
  try {
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    } else {
      if (vendor.live.length === 0) {
        return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotLive });
      } else {
        let live: any = vendor.live[0];
        const liveHistory = new LiveHistory({
          vendorId: vendor._id,
          location: live.location,
          start: live.start,
          end: Date.now(),
        });
        await liveHistory.save();
        vendor.liveHistory.push(liveHistory as any);

        Live.findOneAndDelete({ _id: vendor.live[0]._id }, (error: any, doc: any) => {
          if (error) {
            return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
          }
        });
        vendor.live.pop();

        await vendor.save();

        return sendResponse({ req, res, namespace, ...ResponseInfo.liveEnded, data: liveHistory });
      }
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function goLive(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.goLive`;
  try {
    // TODO: Go live interface
    // Validate live
    const { error } = VendorValidation.goLive(req.body);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }
    // Get vendor by ID
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    } else {
      const ownerId = getUserID(req);
      if (vendor.ownerId == ownerId) {
        if (vendor.live.length === 0) {
          let live = new Live({
            vendorId: vendor._id,
          });

          if (req.body.location) {
            // await live.updateLocation(req.body.location);
          }

          vendor.live.push(live._id);
          if (live.location?.address) vendor.location!.address = live.location.address;

          await vendor.save();

          return sendResponse({ req, res, namespace, ...ResponseInfo.liveStarted, data: live });
        } else {
          return sendErrorResponse({ req, res, namespace, ...ErrorResponse.liveAlreadyStarted });
        }
      } else {
        return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
      }
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function createReview(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.createReview`;
  try {
    // Validate review
    const { error } = VendorValidation.createReview(req.body);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    // Get userId from token
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    // Check if vendor exists
    const vendor = await Vendor.findOne({ _id: req.params.id });
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    // Check if user has a review for this vendor
    if (vendor.reviews) {
      const userReview = vendor.reviews.find((review: any) => review.userId == user._id);
      if (userReview) {
        return sendErrorResponse({ req, res, namespace, ...ErrorResponse.reviewAlreadyExists });
      }
    }

    // Check if user exists
    if (vendor.ownerId === user._id) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.cannotReviewYourOwnVendor });
    } else if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    } else {
      // Create a new review
      const review = new Review({
        userId: user._id,
        title: req.body.title,
        description: req.body.description,
        rating: req.body.rating,
      });
      await review.save();

      // Add review to vendor
      if (!vendor.reviews) {
        vendor.reviews = [review];
        vendor.rating = review.rating;
      } else {
        let totalRating = vendor.rating! * vendor.reviews.length;
        vendor.reviews.push(review);
        totalRating += review.rating;
        vendor.rating = totalRating / vendor.reviews.length;
      }
      await vendor.save();

      return sendResponse({ req, res, namespace, ...ResponseInfo.reviewCreated, data: review });
    }
  } catch (error: any) {
    console.log(error);
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function deleteReview(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.deleteReview`;
  try {
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    if (vendor.reviews && vendor.reviews.length > 0) {
      const userReview: any = vendor.reviews.find((review: any, index: number) => {
        if (review.userId.toString() === user._id.toString()) {
          vendor.reviews.splice(index, 1);
          return review;
        }
      });
      vendor.rating = (vendor.rating! * (vendor.reviews.length + 1) - userReview.rating) / vendor.reviews.length;
      await vendor.save();

      return sendResponse({ req, res, namespace, ...ResponseInfo.reviewDeleted, data: userReview });
    }
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.reviewNotFound });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

// TODO: Address & location
// exports.updateOccurrence = async (req, res) => {
//     const occurrence = await Occurrence.findOneAndUpdate(
//         {_id: req.params.id},
//         req.body,
//         {
//             new: true,
//             runValidators: true,
//         }
//     ).exec();
//     res.status(200).send({data: occurrence});
// };

export async function createOccurrence(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.createOccurrence`;
  try {
    // Validate location or address
    if (!req.body.location && !req.body.location.coordinates && !req.body.address) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.locationRequired });
    }

    // Validate review)
    const { error } = VendorValidation.occurrence(req.body);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    // Get userId from token
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    // Check if vendor exists
    const vendor = await Vendor.findOne({ _id: req.params.id });
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    if (vendor.ownerId !== user._id && !user.roles.includes(UserRoles.ADMIN)) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    } else if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    } else {
      const occurrence = new Occurrence({
        start: Date.parse(req.body.start),
        end: Date.parse(req.body.end),
      });

      const recurrence = req.body.recurrence;
      if (recurrence) {
        occurrence.recurrence = recurrence;
      }

      if (req.body.location) {
        const locationObj: ILocation | undefined = await location_schema.createILocation(req.body.location);
        occurrence.location = locationObj;
      }

      if (!vendor.schedule) {
        vendor.schedule = [occurrence];
      } else {
        vendor.schedule.push(occurrence);
      }
      await occurrence.save();
      await vendor.save();

      return sendResponse({ req, res, namespace, ...ResponseInfo.occurrenceCreated, data: occurrence });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function deleteOccurrence(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.deleteOccurrence`;
  try {
    // Get userId from token
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    // Check if vendor exists
    const vendor = await Vendor.findOne({ _id: req.params.id });
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    // Check user authorization
    if (vendor.ownerId !== user._id && !user.roles.includes(UserRoles.ADMIN)) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    // Check if occurrence exists
    const occurrenceID = req.params.occurrenceID;
    const occurrenceIndex = vendor.schedule.findIndex((occurrence: any) => occurrence._id == occurrenceID);
    if (occurrenceIndex === -1) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.occurrenceNotFound });
    }

    // Remove occurrence
    vendor.schedule.splice(occurrenceIndex, 1);
    await vendor.save();

    return sendResponse({ req, res, namespace, ...ResponseInfo.occurrenceDeleted });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateProfileImage(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateProfileImage`;
  try {
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    if (!user._id || user._id.toString() !== vendor.ownerId?.toString()) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
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
    const partialImageURL = `images/vendors/${vendor.id}/${newImageName}`;

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
      owner: vendor.id,
      ownerType: 'Vendor',
      uploader: user._id,
    });

    vendor.profileImage = newImage;
    await vendor.save();

    if (data.$metadata.httpStatusCode === 200) {
      return sendResponse({ req, res, namespace, ...ResponseInfo.occurrenceUpdated, data: vendor });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.occurrenceUpdateFailed });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateImages(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateImages`;
  try {
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    if (!user._id || user._id.toString() !== vendor.ownerId?.toString()) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    if (!req.files || !req.files.image) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.noFilesUploaded });
    }

    const newImage = (await uploadImage(req, res, user, vendor, `/vendors/${vendor.id}`)) as any;

    if (newImage) {
      vendor.images.push(newImage.toJSON() as IImage);
      await vendor.save();
      return sendResponse({ req, res, namespace, ...ResponseInfo.imageCreated, data: newImage });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.imageUploadFailed });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateMenuItemImage(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateMenuItemImage`;

  try {
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    const menuItem = await MenuItem.findById(req.params.id2);
    if (!menuItem) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.menuItemNotFound });
    }
    const vendor = await Vendor.findById(req.params.id);
    if (!vendor) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.vendorNotFound });
    }

    if (!user._id || user._id.toString() !== vendor.ownerId?.toString()) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
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
    const partialImageURL = `images/vendors/${vendor.id}/menu/${newImageName}`;

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
      owner: vendor.id,
      ownerType: 'MenuItem',
      uploader: user._id,
    });

    menuItem!.image = newImage;
    menuItem?.save();

    const index = vendor.menu.findIndex((item) => item._id?.toString() === menuItem?._id.toString());
    if (index !== -1) {
      vendor.menu[index] = menuItem?.toJSON() as IMenuItem;
    }
    await vendor.save();

    if (data.$metadata.httpStatusCode === 200) {
      return sendResponse({ req, res, namespace, ...ResponseInfo.menuItemImageUploaded, data: vendor });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.menuItemImageUploadFailed });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function findVendorsFromOwner(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.findVendorsFromOwner`;
  try {
    const ownerId = req.params.ownerId;
    const vendors = await Vendor.find({ ownerId });

    if (vendors.length === 0 || !vendors) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.noVendorsFound });
    } else {
      return sendResponse({ req, res, namespace, ...ResponseInfo.vendorsFound, data: vendors });
    }
  } catch (error) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
