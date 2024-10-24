import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongoose';
import User from '../models/user-model';
import { ErrorResponse, sendErrorResponse } from '../shared/helpers/response';
const { TokenExpiredError, JsonWebTokenError } = jwt;

const baseNamespace: string = 'jwt';

export function getUserID(req: Request): ObjectId | undefined {
  const authToken = req.header('access-token');
  if (authToken) {
    const userId = (jwt.decode(authToken as string) as JwtPayload)['_id'];
    return userId;
  } else {
    return;
  }
}

export async function verifyTokens(req: Request, res: Response, next: NextFunction) {
  const namespace: string = `${baseNamespace}.verifyTokens`;
  try {
    // TODO: Update tokens as 'BEARER token1 token2' or something like that
    // Grab the tokens from the header
    const accessToken = req.header('access-token');
    const refreshToken = req.header('refresh-token');

    // Make sure the user added the tokens to the request payload
    if (!accessToken || !refreshToken) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.unauthorized });
    }
    // Verify the auth token
    let accessVerified = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET as string) as JwtPayload;

    // If the auth token is valid, pass the request to the next middleware
    if (accessVerified) {
      // Add the user to the request payload for access in the next middleware
      res.header('access-token', accessToken);
      res.header('refresh-token', refreshToken);
      next();
    }
  } catch (error: any) {
    // If the auth token is expired, try to refresh it
    return catchError(error, req, res, next);
  }
}

async function catchError(error: any, req: Request, res: Response, next: NextFunction) {
  const namespace: string = `${baseNamespace}.catchError`;
  if (error instanceof TokenExpiredError) {
    // Verify refresh token
    try {
      let refreshToken = req.header('refresh-token');
      let refreshVerified = jwt.verify(
        refreshToken as string,
        process.env.REFRESH_TOKEN_SECRET as string,
      ) as JwtPayload;
      let user = await User.findById(refreshVerified._id);
      if (!user) {
        return sendErrorResponse({ req, res, namespace, ...ErrorResponse.userNotFound });
      }

      // Resign access token
      if (refreshVerified) {
        const token = jwt.sign(user.toJSON(), process.env.ACCESS_TOKEN_SECRET as string, { expiresIn: '15min' });

        res.header('access-token', token);
        res.header('refresh-token', refreshToken);

        next();
      }
    } catch (error) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
    }
  } else if (error instanceof JsonWebTokenError) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.invalidToken });
  } else {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
