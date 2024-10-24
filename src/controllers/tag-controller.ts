import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Request, Response } from 'express';
import fs from 'fs';
import { getUserID } from '../middleware/jwt';
import Image from '../models/image-model';
import Tag from '../models/tag-model';
import User from '../models/user-model';
import { ErrorResponse, ResponseInfo, sendErrorResponse, sendResponse } from '../shared/helpers/response';
import { UserRoles } from '../shared/interfaces/user-roles';

const baseNamespace: string = 'tag-controller';

export async function getAllTags(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.getAllTags`;
  try {
    const tags = await Tag.find();
    if (tags.length > 0) {
      return sendResponse({ req, res, namespace, ...ResponseInfo.tagsFound, data: tags });
    } else {
      return sendResponse({ req, res, namespace, ...ResponseInfo.tagsFound, data: tags });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError });
  }
}

export async function createTag(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.createTag`;
  try {
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    if (!user.roles.includes(UserRoles.ADMIN)) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }

    const tag = await Tag.create({ title: req.body.title });
    return sendResponse({ req, res, namespace, ...ResponseInfo.tagCreated, data: tag });
  } catch (error) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function updateTagsImage(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.updateTagsImage`;
  try {
    const tag = await Tag.findById(req.params.id);
    if (!tag) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.tagNotFound });
    }

    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    if (!user.roles.includes(UserRoles.ADMIN)) {
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
    const partialImageURL = `images/tags/${tag._id}/${newImageName}`;

    // TODO: DO  IN APP.JS AND EXPORT??
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
    // Check if the image failed to upload
    if (data.$metadata.httpStatusCode !== 200) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.imageUploadFailed });
    }

    // TODO: Seperate function
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
      owner: tag.id,
      ownerType: 'Tag',
      uploader: user._id,
    });

    tag.image = newImage;
    tag.save();

    return sendResponse({ req, res, namespace, ...ResponseInfo.tagUpdated, data: tag });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
