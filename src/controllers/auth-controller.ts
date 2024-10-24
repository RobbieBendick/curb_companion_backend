import { Request, Response } from 'express';

import { createHash } from 'crypto';
import jwt, { JsonWebTokenError, JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { ACCESS_JWT_EXPIRATION, APPLE_AUTH, GOOGLE_AUTH, REFRESH_JWT_EXPIRATION } from '../config/constants';
import { getUserID } from '../middleware/jwt';
import AccessToken from '../models/access-token-model';
import Image from '../models/image-model';
import { createILocation } from '../models/location-schema';
import RefreshToken from '../models/refresh-token-model';
import User from '../models/user-model';
import {
  VerificationTokenDoesNotExistError,
  VerificationTokenExpiredError,
  VerificationTokenInvalidError,
} from '../models/verification-token';
import { ErrorResponse, ResponseInfo, sendErrorResponse, sendResponse } from '../shared/helpers/response';
import {
  AppleOAuthRequest,
  ForgotPasswordResetRequest,
  GenericCodeRequest,
  GenericOAuthResponse,
  GenericOAuthUser,
  GoogleOAuthRequest,
  ResetPasswordRequest,
} from '../shared/interfaces/auth';
import ILocation from '../shared/interfaces/location';
import { AuthValidation } from '../validations/auth-validation';

const baseNamespace: string = 'auth-controller';

function hashJWT(jwt: string) {
  return createHash('sha256').update(jwt).digest('hex');
}

export async function loginNew(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.loginNew`;
  try {
    const params = req.body;

    // Check if email exists
    const user = await User.findOne({ email: params.email });
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidEmailPasswordCombination });
    }

    // Check if email is verified
    if (!user.verified) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidEmailPasswordCombination });
    }

    // Check if PW matches
    const validPass = await user.comparePassword(params.password);
    if (!validPass) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidEmailPasswordCombination });
    }

    if (params.deviceToken && params.deviceToken !== user.deviceToken) {
      user.deviceToken = params.deviceToken as string;
    }

    user.lastLoggedIn = new Date();
    await user.save();

    const oldAccessToken = await AccessToken.findOne({ userId: user.id });
    if (oldAccessToken) {
      await oldAccessToken.delete();
    }

    const oldRefreshToken = await RefreshToken.findOne({ userId: user.id });
    if (oldRefreshToken) {
      await oldRefreshToken.delete();
    }

    // Create and assign a token
    const accessToken = jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET as string, {
      expiresIn: ACCESS_JWT_EXPIRATION,
    });
    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET as string, {
      expiresIn: REFRESH_JWT_EXPIRATION,
    });

    const hashedAccessToken = hashJWT(accessToken);

    const createdAccessToken = await AccessToken.create({
      token: hashedAccessToken,
      userId: user.id,
    });

    const createdRefreshToken = await RefreshToken.create({
      token: hashJWT(refreshToken),
      userId: user.id,
    });

    const tokenType = 'Bearer';

    const expiresIn = ACCESS_JWT_EXPIRATION;

    await createdAccessToken.save();
    await createdRefreshToken.save();

    // Send back the tokens in the headers
    res.header('access-control-allow-origin', '*');

    return sendResponse({
      req,
      res,
      namespace,
      ...ResponseInfo.loginSuccessful,
      data: { accessToken, refreshToken, expiresIn, tokenType },
    });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function authorizeNew(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.authorizeNew`;

  try {
    console.log(req.headers);
    const authorization = req.get('Authorization');
    if (!authorization) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.malformedAccessToken });
    }

    const splitAccessToken = authorization.split(' ');
    if (splitAccessToken.length != 2 && splitAccessToken[0].toLowerCase() !== 'bearer') {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.malformedAccessToken });
    }

    let accessVerified = jwt.verify(splitAccessToken[1], process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;
    if (!accessVerified) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.expiredAccessToken });
    }

    // Find user
    let user = await User.findById(accessVerified['id']);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    let accessTokenInDb = await AccessToken.findOne({ token: hashJWT(splitAccessToken[1]) });
    if (!accessTokenInDb) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.revokedAccessToken });
    }

    return sendResponse({ req, res, namespace, ...ResponseInfo.userFound, data: user });
  } catch (error: any) {
    if (error instanceof TokenExpiredError) {
      console.log('expired');
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.expiredRefreshToken });
    } else if (error instanceof JsonWebTokenError) {
      console.log('invalid');
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidRefreshToken });
    } else {
      console.log('internal');
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
    }
  }
}

export async function refreshTokensNew(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.refreshTokensNew`;

  try {
    const authorization = req.get('Authorization');
    if (!authorization) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.malformedRefreshToken });
    }

    const splitRefreshToken = authorization.split(' ');

    if (splitRefreshToken.length != 2 && splitRefreshToken[0].toLowerCase() !== 'bearer') {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.malformedRefreshToken });
    }

    let refreshVerified = jwt.verify(splitRefreshToken[1], process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload;
    if (!refreshVerified) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.expiredRefreshToken });
    }

    // Find user
    let user = await User.findById(refreshVerified['id']);
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    let refreshTokenInDb = await RefreshToken.findOne({ token: hashJWT(splitRefreshToken[1]) });
    if (!refreshTokenInDb === undefined) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.revokedRefreshToken });
    }

    const oldAccessToken = await AccessToken.findOne({ userId: user.id });
    if (oldAccessToken) {
      await oldAccessToken.delete();
    }

    const oldRefreshToken = await RefreshToken.findOne({ userId: user.id });
    if (oldRefreshToken) {
      await oldRefreshToken.delete();
    }

    // Create and assign a token
    const accessToken = jwt.sign({ id: user.id }, process.env.ACCESS_TOKEN_SECRET as string, {
      expiresIn: ACCESS_JWT_EXPIRATION,
    });
    const refreshToken = jwt.sign({ id: user.id }, process.env.REFRESH_TOKEN_SECRET as string, {
      expiresIn: REFRESH_JWT_EXPIRATION,
    });

    const hashedAccessToken = hashJWT(accessToken);

    const createdAccessToken = await AccessToken.create({
      token: hashedAccessToken,
      userId: user.id,
    });

    const hashedRefreshToken = hashJWT(refreshToken);

    const createdRefreshToken = await RefreshToken.create({
      token: hashedRefreshToken,
      userId: user.id,
    });

    const tokenType = 'Bearer';

    const expiresIn = ACCESS_JWT_EXPIRATION;

    await createdAccessToken.save();
    await createdRefreshToken.save();

    // Send back the tokens in the headers
    res.header('access-control-allow-origin', '*');

    return sendResponse({
      req,
      res,
      namespace,
      ...ResponseInfo.loginSuccessful,
      data: { accessToken, refreshToken, expiresIn, tokenType },
    });
  } catch (error: any) {
    if (error instanceof TokenExpiredError) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.expiredRefreshToken });
    } else if (error instanceof JsonWebTokenError) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidRefreshToken });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
    }
  }
}

export async function register(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.register`;
  try {
    const params = req.body;

    // Check if email exists.
    const emailExists = await User.findOne({ email: params.email });
    if (emailExists) {
      return sendErrorResponse({ req, res, ...ErrorResponse.emailInUse, namespace });
    }

    // Check if passwords match.
    if (params.password !== params.confirmPassword) {
      return sendErrorResponse({ req, res, ...ErrorResponse.passwordsDoNotMatch, namespace });
    }

    // Create a new user.
    const user = new User({
      email: params.email,
      password: params.password,
      firstName: params.firstName,
      surname: params.surname,
    });

    if (params.location) {
      const locationObj: ILocation | undefined = await createILocation(req.body.location);
      user.location = locationObj;
      if (params.savedLocations) {
        for (const location of params.savedLocations) {
          const locationObj: ILocation | undefined = await createILocation(location);
          if (locationObj) user.saveLocation(locationObj);
        }
      }
    }

    // Save user.
    var test = await user.save().catch((err) => {
      console.log(err);
    });

    if (process.env.NODE_ENV === 'test') {
      return sendResponse({ req, res, namespace, ...ResponseInfo.verificationEmailSent });
    }

    // Send the verification email to the User's email.
    return await emailVerification(req, res);
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function emailVerification(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.emailVerification`;
  try {
    const { email } = req.body;

    const { error } = AuthValidation.genericEmailRequest({ email });
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    // Check if email exists
    const user = await User.findOne({ email: email });
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    await user.sendEmailVerificationCode();

    return sendResponse({ req, res, namespace, ...ResponseInfo.verificationEmailSent });
  } catch (error: any) {
    return sendErrorResponse({ req, res, ...ErrorResponse.internalServerError, namespace, stacktrace: error });
  }
}

export async function verifyEmail(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.verifyEmail`;
  try {
    const params: GenericCodeRequest = req.body;
    const { error } = AuthValidation.genericCodeRequest(params);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }
    // Try to find the user from the email to acquire the user ID
    const user = await User.findOne({ email: params.email });
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    await user.verifyCode(req.body.code);
    await user.deleteCode();

    user.verified = true;
    await user.save();
    return sendResponse({ req, res, namespace, ...ResponseInfo.verificationSuccessful });
  } catch (error: any) {
    if (
      error instanceof VerificationTokenDoesNotExistError ||
      error instanceof VerificationTokenExpiredError ||
      error instanceof VerificationTokenInvalidError
    ) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidToken });
    }
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function login(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.login`;
  try {
    const params = req.body;

    // Check if email exists
    const user = await User.findOne({ email: params.email });
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidEmailPasswordCombination });
    }

    // Check if email is verified
    if (!user.verified) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidEmailPasswordCombination });
    }

    // Check if PW matches
    const validPass = await user.comparePassword(params.password);
    if (!validPass) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidEmailPasswordCombination });
    }

    if (params.deviceToken && params.deviceToken !== user.deviceToken) {
      user.deviceToken = params.deviceToken as string;
    }

    user.lastLoggedIn = new Date();
    await user.save();
    const jwtData = user.toJSON();

    // Create and assign a token
    const token = jwt.sign(jwtData, process.env.ACCESS_TOKEN_SECRET as string, {
      expiresIn: ACCESS_JWT_EXPIRATION,
    });
    const refreshToken = jwt.sign(jwtData, process.env.REFRESH_TOKEN_SECRET as string, {
      expiresIn: REFRESH_JWT_EXPIRATION,
    });

    // Send back the tokens in the headers
    res.header('access-token', token);
    res.header('refresh-token', refreshToken);
    res.header('access-control-allow-origin', '*');

    return sendResponse({ req, res, namespace, ...ResponseInfo.loginSuccessful, data: user });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function tokenVerification(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.tokenVerification`;
  try {
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }
    return sendResponse({ req, res, namespace, ...ResponseInfo.credentialsVerified, data: user });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.resetPassword`;
  try {
    const params: ResetPasswordRequest = req.body;

    const { error } = AuthValidation.resetPasswordRequest(params);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    // Check if the user exists based on the token.
    const user = await User.findById(getUserID(req));
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    // Check if the passwords match, if so update the password.
    if (params.password === params.confirmPassword) {
      user.password = params.password;
      await user.save();
      return sendResponse({ req, res, namespace, ...ResponseInfo.passwordResetSuccessful });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.passwordsDoNotMatch });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.forgotPassword`;
  try {
    const { email } = req.body;

    const { error } = AuthValidation.genericEmailRequest({ email });
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    // Try to find the user from the email to acquire the user ID.
    const user = await User.findOne({ email: email });
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    await user.sendPasswordResetCode();

    return sendResponse({ req, res, namespace, ...ResponseInfo.passwordResetEmailSent });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function verifyForgotPassword(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.verifyForgotPassword`;
  try {
    const params: GenericCodeRequest = req.body;

    const { error } = AuthValidation.genericCodeRequest(params);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    // Try to find the user from the email to acquire the user ID.
    const user = await User.findOne({ email: params.email });
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    await user.verifyCode(params.code.toString());

    return sendResponse({ req, res, namespace, ...ResponseInfo.verificationSuccessful });
  } catch (error: any) {
    if (
      error instanceof VerificationTokenDoesNotExistError ||
      error instanceof VerificationTokenExpiredError ||
      error instanceof VerificationTokenInvalidError
    ) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidToken });
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
    }
  }
}

export async function forgotPasswordReset(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.forgotPasswordReset`;
  try {
    const params: ForgotPasswordResetRequest = req.body;

    const { error } = AuthValidation.forgotPasswordResetRequest(params);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    // Try to find the user from the email to acquire the user ID.
    const user = await User.findOne({ email: params.email });
    if (!user) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
    }

    await user.verifyCode(params.code.toString());

    await user.deleteCode();

    // Hash and store the password.
    user.password = params.password;
    await user.save();

    return sendResponse({ req, res, namespace, ...ResponseInfo.passwordResetSuccessful });
  } catch (error: any) {
    if (
      error instanceof VerificationTokenDoesNotExistError ||
      error instanceof VerificationTokenExpiredError ||
      error instanceof VerificationTokenInvalidError
    ) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidToken });
    }
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

async function key(kid: string, url: string): Promise<jwksClient.SigningKey> {
  const client = jwksClient({
    jwksUri: url,
    timeout: 30000,
  });

  return await client.getSigningKey(kid);
}

export async function googleAuth(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.googleAuth`;
  try {
    const params: GoogleOAuthRequest = req.body;

    const { error } = AuthValidation.googleOAuthRequest(params);
    if (error) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    const { header } = jwt.decode(params.identityToken, {
      complete: true,
    }) as { header: { kid: string } };

    const kid = header.kid;
    const publicKey = (await key(kid, GOOGLE_AUTH)).getPublicKey();

    const {
      sub,
      email,
      email_verified: emailVerified,
    } = jwt.verify(params.identityToken, publicKey) as {
      sub: string;
      email: string;
      email_verified: boolean;
    };

    const response: GenericOAuthResponse = {
      sub,
      email,
      emailVerified,
    };
    const { error: respError } = AuthValidation.genericOAuthResponse(response);
    if (respError) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: respError.details,
      });
    }
    const googleUser: GenericOAuthUser = { ...response, ...params };

    if (googleUser.sub) {
      const user = await User.findOne({ $or: [{ googleId: googleUser.sub }, { email: googleUser.email }] });
      if (!user) {
        // Create a new user.
        const newUser = new User({
          googleId: googleUser.sub,
          firstName: googleUser.firstName,
          surname: googleUser.surname,
          email: googleUser.email,
          verified: googleUser.emailVerified,
        });

        if (params.photoUrl) {
          newUser.profileImage = await Image.create({
            name: 'Google Photo',
            imageURL: params.photoUrl,
            owner: newUser.id,
            ownerType: 'User',
            uploader: newUser.id,
            uploadedAt: new Date(),
          });
        }

        await newUser.save();
        // Create and assign a token
        const token = jwt.sign(newUser.toJSON(), process.env.ACCESS_TOKEN_SECRET as string, {
          expiresIn: ACCESS_JWT_EXPIRATION,
        });
        const refreshToken = jwt.sign(newUser.toJSON(), process.env.REFRESH_TOKEN_SECRET as string, {
          expiresIn: REFRESH_JWT_EXPIRATION,
        });

        // Send back the tokens in the headers
        res.header('access-token', token);
        res.header('refresh-token', refreshToken);

        return sendResponse({ req, res, namespace, ...ResponseInfo.userCreated, data: newUser });
      } else {
        // Create and assign a token
        const token = jwt.sign(user.toJSON(), process.env.ACCESS_TOKEN_SECRET as string, {
          expiresIn: ACCESS_JWT_EXPIRATION,
        });
        const refreshToken = jwt.sign(user.toJSON(), process.env.REFRESH_TOKEN_SECRET as string, {
          expiresIn: REFRESH_JWT_EXPIRATION,
        });

        // Update last logged in
        if (user.profileImage === undefined && params.photoUrl) {
          user.profileImage = await Image.create({
            name: 'Google photo',
            imageURL: params.photoUrl,
            owner: user.id,
            ownerType: 'User',
            uploader: user.id,
            uploadedAt: new Date(),
          });
        }
        user.verified = googleUser.emailVerified;
        if (user.googleId === undefined) user.googleId = googleUser.sub;
        user.lastLoggedIn = new Date();
        await user.save();

        // Send back the tokens in the headers
        res.header('access-token', token);
        res.header('refresh-token', refreshToken);

        return sendResponse({ req, res, namespace, ...ResponseInfo.userFound, data: user });
      }
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidToken });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}

export async function appleAuth(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.appleAuth`;
  try {
    const params: AppleOAuthRequest = req.body;

    // const { error } = AuthValidation.appleOAuthRequest(params);
    // if (error) {
    //   return sendErrorResponse({ req, res, namespace, ...ErrorResponse.validationErrors, validationErrors: error.details });
    // }

    if (
      params.identityToken === undefined ||
      params.firstName === undefined ||
      params.surname === undefined ||
      params.email === undefined
    ) {
      const user = await User.findOne({ appleId: params.code });
      if (!user) {
        return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
      } else {
        user.lastLoggedIn = new Date();
        await user.save();
        const jwtData = user.toJSON();

        // Create and assign a token
        const token = jwt.sign(jwtData, process.env.ACCESS_TOKEN_SECRET as string, {
          expiresIn: ACCESS_JWT_EXPIRATION,
        });
        const refreshToken = jwt.sign(jwtData, process.env.REFRESH_TOKEN_SECRET as string, {
          expiresIn: REFRESH_JWT_EXPIRATION,
        });

        // Send back the tokens in the headers
        res.header('access-token', token);
        res.header('refresh-token', refreshToken);
        return sendResponse({ req, res, namespace, ...ResponseInfo.userFound, data: user });
      }
    }
    const { header } = jwt.decode(params.identityToken, {
      complete: true,
    }) as { header: { kid: string } };

    const kid = header.kid;
    const publicKey = (await key(kid, APPLE_AUTH)).getPublicKey();

    const {
      sub,
      email,
      email_verified: emailVerified,
    } = jwt.verify(params.identityToken, publicKey) as {
      sub: string;
      email: string;
      email_verified: boolean;
    };
    const response: GenericOAuthResponse = {
      sub,
      email,
      emailVerified,
    };
    const { error: respError } = AuthValidation.genericOAuthResponse(response);
    if (respError) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: respError.details,
      });
    }
    const appleUser = { ...response, ...params };
    if (appleUser.sub) {
      let user = await User.findOne({ $or: [{ appleId: appleUser.sub }, { email: appleUser.email }] });
      if (!user) {
        // Create a new user.
        const newUser = new User({
          appleId: appleUser.sub,
          firstName: appleUser.firstName,
          surname: appleUser.surname,
          email: appleUser.email,
          verified: appleUser.emailVerified,
        });

        await newUser.save();
        // Create and assign a token
        const token = jwt.sign(newUser.toJSON(), process.env.ACCESS_TOKEN_SECRET as string, {
          expiresIn: ACCESS_JWT_EXPIRATION,
        });
        const refreshToken = jwt.sign(newUser.toJSON(), process.env.REFRESH_TOKEN_SECRET as string, {
          expiresIn: REFRESH_JWT_EXPIRATION,
        });

        // Send back the tokens in the headers
        res.header('access-token', token);
        res.header('refresh-token', refreshToken);
        return sendResponse({ req, res, namespace, ...ResponseInfo.userCreated, data: newUser });
      } else {
        // Create and assign a token
        const token = jwt.sign(user.toJSON(), process.env.ACCESS_TOKEN_SECRET as string, {
          expiresIn: ACCESS_JWT_EXPIRATION,
        });
        const refreshToken = jwt.sign(user.toJSON(), process.env.REFRESH_TOKEN_SECRET as string, {
          expiresIn: REFRESH_JWT_EXPIRATION,
        });

        // Update last logged in
        user.verified = appleUser.emailVerified;
        if (user.appleId === undefined) user.appleId = appleUser.sub;
        user.lastLoggedIn = new Date();
        await user.save();

        // Send back the tokens in the headers
        res.header('access-token', token);
        res.header('refresh-token', refreshToken);

        return sendResponse({ req, res, namespace, ...ResponseInfo.userFound, data: user });
      }
    } else {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidToken });
    }
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
