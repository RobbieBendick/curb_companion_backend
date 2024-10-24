import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Request, Response } from 'express';
import fs from 'fs';
import { AWS_S3_BUCKET_URI } from '../config/constants';
import Image from '../models/image-model';
import { IUserDocument } from '../models/user-model';
import { IVendorDocument } from '../models/vendor-model';
import { ErrorResponse, sendErrorResponse } from '../shared/helpers/response';

const baseNamespace: string = 'helpers';

export function randomizeString(originalString: string) {
  var randomizedString = '';
  for (var i = 0; i < originalString.length; i++) {
    var randomHexDigit = Math.floor(Math.random() * 16).toString(16);
    randomizedString += randomHexDigit;
  }
  return randomizedString;
}

export async function uploadProfileImage(
  req: Request,
  res: Response,
  user: IUserDocument,
  vendor: IVendorDocument,
  route: string,
): Promise<any> {
  const namespace: string = `${baseNamespace}.uploadProfileImage`;
  try {
    if (!req.files || !req.files.profileImage) return;
    const image: any = req.files.profileImage;
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
    const partialImageURL = `images/${route}/${newImageName}`;

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
    return newImage;
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError });
  }
}
export async function uploadImage(
  req: Request,
  res: Response,
  user: IUserDocument,
  vendor: IVendorDocument,
  route: string,
): Promise<any> {
  const namespace: string = `${baseNamespace}.uploadImage`;

  try {
    if (!req.files || !req.files.image) return;
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
    const partialImageURL = `images/${route}/${newImageName}`;

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

    await s3Client.send(new PutObjectCommand(bucketParams));

    while (await Image.findOne({ name: newImageName })) {
      newImageName = `${newImageName}.${randomizeString(minImageName)}`;
    }

    const newImage = await Image.create({
      name: newImageName,
      imageURL: `${AWS_S3_BUCKET_URI}${partialImageURL}`,
      owner: vendor.id,
      ownerType: 'Vendor',
      uploader: user._id,
    });
    return newImage;
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError });
  }
}
