import { compare, genSalt, hash } from 'bcryptjs';
import mongoose, { Document, Schema, model } from 'mongoose';
import { createHash, randomInt } from 'node:crypto';
import nodemailer from 'nodemailer';
import { deepEquals } from '../shared/helpers/helpers';
import ILocation from '../shared/interfaces/location';
import IUser from '../shared/interfaces/user';
import { UserRoles } from '../shared/interfaces/user-roles';
import { imageSchema } from './image-model';
import locationSchema from './location-schema';
import VerificationToken, {
  VerificationTokenDoesNotExistError,
  VerificationTokenExpiredError,
  VerificationTokenInvalidError,
} from './verification-token';

export interface IUserDocument extends IUser, Document {
  // Add methods here.
  sendEmailVerificationCode: () => Promise<void>;
  sendPasswordResetCode: () => Promise<void>;
  verifyCode: (code: string) => Promise<boolean>;
  comparePassword: (password: string) => Promise<boolean>;
  deleteCode: () => Promise<void>;
  saveLocation: (location: ILocation) => Promise<boolean>;
  unsaveLocation: (location: ILocation) => Promise<boolean>;
}

interface UserModel extends mongoose.Model<IUserDocument> {
  // Add static methods here.
}

const userSchema: Schema<IUserDocument> = new Schema(
  {
    // Simple permission handling for now, until the need for more roles.
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    profileImage: {
      type: imageSchema,
      required: false,
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    password: {
      type: String,
      required: false,
      select: false,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    firstName: {
      type: String,
      required: false,
    },
    surname: {
      type: String,
      required: false,
    },
    appleId: {
      type: String,
      required: false,
    },
    googleId: {
      type: String,
      required: false,
    },

    dateOfBirth: {
      type: Date,
      required: false,
    },
    gender: {
      type: String,
      required: false,
      enum: ['Male', 'Female', 'Other'],
    },
    favorites: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Favorite',
        },
      ],
      default: [],
    },
    recentlyViewedVendors: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Vendor',
        },
      ],
      maxlength: 10,
      default: [],
    },
    location: {
      type: locationSchema,
      required: false,
    },
    roles: {
      type: [String],
      enum: [UserRoles.ADMIN, UserRoles.VENDOR_OWNER, UserRoles.VENDOR_EMPLOYEE],
    },
    savedLocations: {
      type: [
        {
          type: locationSchema,
          ref: 'Location',
        },
      ],
      default: [],
    },
    deviceToken: {
      type: String,
      required: false,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    lastLoggedIn: {
      type: Date,
      default: Date.now,
    },
  },
  {},
);

userSchema.methods.sendEmailVerificationCode = async function () {
  try {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_ADDRESS,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const code = randomInt(100000, 1000000);

    const token = new VerificationToken({ userId: this._id, token: code.toString() });
    await token.save();

    await transporter.sendMail({
      from: `"Curb Companion" <${process.env.SMTP_DOMAIN_ADDRESS}>`,
      to: this.email,
      subject: 'Curb Companion email verification - noreply',
      text: `Welcome to Curb Companion!\n\n
            To verify your email, enter the code here: ${code}`,
      html: `<p>Welcome to Curb Companion!</p>
            <p>&nbsp;</p>
            <p>To verify your email, enter the code here: ${code} </p>`,
    });
  } catch (e) {
    throw Error('Error sending verification email');
  }
};

userSchema.methods.sendPasswordResetCode = async function () {
  try {
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_ADDRESS,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    const code = randomInt(100000, 1000000);

    const token = new VerificationToken({ userId: this._id, token: code.toString() });
    await token.save();

    await transporter.sendMail({
      from: `"Curb Companion - noreply" <${process.env.SMTP_ADDRESS}>`,
      to: this.email,
      subject: 'Curb Companion reset password verification - noreply',
      text: `Welcome to Curb Companion!\n\n
            To reset you password, enter the code here: ${code}`,
      html: `<p>Welcome to Curb Companion!</p>
            <p>&nbsp;</p>
            <p>To reset your password, enter the code here: ${code} </p>`,
    });
  } catch (e) {
    throw Error('Error sending forgot password email');
  }
};

userSchema.methods.verifyCode = async function (code: string) {
  // Check if the verification token exists.
  let verifyEmailToken = await VerificationToken.findOne({ userId: this._id });
  if (!verifyEmailToken) {
    throw new VerificationTokenDoesNotExistError('Verification token does not exist');
  }

  // Check if the verification token is valid.
  if (verifyEmailToken.token !== createHash('sha256').update(code.toString()).digest('hex')) {
    throw new VerificationTokenInvalidError('Verification token is invalid');
  }

  // Check if the verification token has expired.
  if (verifyEmailToken.tokenExpiresAt! < new Date()) {
    await verifyEmailToken.remove();
    throw new VerificationTokenExpiredError('Verification token has expired');
  } else {
    await verifyEmailToken.extendExpiration();
  }
};

userSchema.methods.deleteCode = async function () {
  // Check if the verification token exists.
  let verificationToken = await VerificationToken.findOne({ userId: this._id });
  if (!verificationToken) {
    throw new VerificationTokenDoesNotExistError('Verification token does not exist');
  } else {
    await verificationToken.remove();
  }
};

userSchema.methods.hashPassword = async function () {
  this.password = await hash(this.password, 10);
};

userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const user = await mongoose.models['User'].findOne({ _id: this._id }).select('+password');
  return await compare(password, user.password);
};

userSchema.methods.saveLocation = async function (location: ILocation) {
  for (let i = 0; i < this.savedLocations.length; i++) {
    if (deepEquals(this.savedLocations[i].coordinates, location.coordinates)) {
      return false;
    }
  }

  this.savedLocations.push(location);
  return true;
};

userSchema.methods.unsaveLocation = async function (location: ILocation) {
  for (let i = 0; i < this.savedLocations.length; i++) {
    if (deepEquals(this.savedLocations[i].coordinates, location!.coordinates)) {
      this.savedLocations.splice(i, 1);
      return true;
    }
  }
  return false;
};

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    const salt = await genSalt(10);
    this.password = await hash(this.password!, salt);
  }
  next();
});

// TODO: User update hook to hash password.
// TODO: Past passwords array to check if the password has been used before.
// TODO: Add full name virtual.

const User = model<IUserDocument, UserModel>('User', userSchema);
export default User;
