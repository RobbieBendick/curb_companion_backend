import { Request, Response } from 'express';
import Logger from '../../config/log';

enum StatusCode {
  // Successful
  Ok = 200,
  Created = 201,
  NoContent = 204,

  // Errors
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  Conflict = 409,
  TooManyRequests = 429,
  InternalServerError = 500,
}

// TODO:
// Validation errors and see if this compiles.
// Rewrite all of this to support sending a regular response, an error response, and maybe validation error response
//
// Regular responses will look like:
// {
//   "data": {
//     ...
//   },
//   "message": "This is a succesful response message"
// }
//
// Error responses will look like:
// {
//   "error": "sample_error"
//   "errorMessage": "Sample error."
// }
//
// (Maybe?)
// Validation error responses will look like:
// {
//   "validation_errors": {
//     "Validation error message",
//     ...
//   },
//   "error": "validation_error",
//   "errorMessage": "One or more validation errors occurred."
// }

export function sendResponse({
  req,
  res,
  message,
  data,
  status = StatusCode.Ok,
  namespace,
  count,
}: {
  req: Request;
  res: Response;
  message: string;
  data?: any;
  status?: number;
  namespace?: string;
  count?: number;
}) {
  const { ip } = req;
  if (namespace !== undefined) {
    Logger.info(message, { namespace, ip, status, data, count });
  }

  return res.status(status).send({ message, data, count });
}

export function sendErrorResponse({
  req,
  res,
  error,
  errorMessage,
  status,
  stacktrace,
  namespace,
  validationErrors,
}: {
  req: Request;
  res: Response;
  error: string;
  errorMessage: string;
  status: number;
  stacktrace?: any;
  namespace?: string;
  validationErrors?: any;
}) {
  const { ip } = req;

  if (stacktrace !== undefined) {
    Logger.error(`Error: ${error}. Error message: ${errorMessage}. View full stacktrace.`, {
      namespace,
      ip,
      stacktrace,
    });
  } else {
    Logger.warn(`Error: ${error}. Error message: ${errorMessage}`, { namespace, ip });
  }
  if (validationErrors) {
    return res.status(status).send({ error, errorMessage, validationErrors });
  } else {
    return res.status(status).send({ error, errorMessage });
  }
}

export const ErrorResponse = {
  rateLimitExceeded: {
    error: 'rate_limit_exceeded',
    errorMessage: 'Rate limit exceeded',
    status: StatusCode.TooManyRequests,
  },
  internalServerError: {
    error: 'internal_sever_error',
    errorMessage: 'Internal server error',
    status: StatusCode.InternalServerError,
  },
  malformedAccessToken: {
    error: 'malformed_access_token',
    errorMessage: 'Access token malformed.',
    status: StatusCode.BadRequest,
  },
  expiredAccessToken: {
    error: 'expired_access_token',
    errorMessage: 'Access token expired.',
    status: StatusCode.Unauthorized,
  },
  invalidAccessToken: {
    error: 'invalid_access_token',
    errorMessage: 'Access token invalid.',
    status: StatusCode.BadRequest,
  },
  revokedAccessToken: {
    error: 'revoked_access_token',
    errorMessage: 'Access token revoked.',
    status: StatusCode.Unauthorized,
  },
  malformedRefreshToken: {
    error: 'malformed_refresh_token',
    errorMessage: 'Malformed access token',
    status: StatusCode.BadRequest,
  },
  expiredRefreshToken: {
    error: 'expired_refresh_token',
    errorMessage: 'Refresh token expired.',
    status: StatusCode.Unauthorized,
  },
  invalidRefreshToken: {
    error: 'invalid_refresh_token',
    errorMessage: 'Refresh token invalid.',
    status: StatusCode.BadRequest,
  },
  revokedRefreshToken: {
    error: 'revoked_refresh_token',
    errorMessage: 'Refresh token revoked.',
    status: StatusCode.Unauthorized,
  },
  noFilesUploaded: {
    error: 'no_files_uploaded',
    errorMessage: 'No files uploaded',
    status: StatusCode.BadRequest,
  },
  invalidImageType: {
    error: 'invalid_image_types',
    errorMessage: 'Invalid image type',
    status: StatusCode.BadRequest,
  },
  tagUpdateFailed: {
    error: 'tag_update_failed',
    errorMessage: 'Tag update failed',
    status: StatusCode.BadRequest,
  },
  locationRequired: {
    error: 'location_required',
    errorMessage: 'Location required',
    status: StatusCode.BadRequest,
  },
  validationErrors: {
    error: 'validation_errors',
    errorMessage: "Validation errors: Some fields weren't filled out correctly",
    status: StatusCode.BadRequest,
  },
  passwordsDoNotMatch: {
    error: 'passwords_do_not_match',
    errorMessage: 'Passwords do not match',
    status: StatusCode.BadRequest,
  },
  deviceTokenAlreadyExists: {
    error: 'device_token_already_exists',
    errorMessage: 'Device token already exists',
    status: StatusCode.BadRequest,
  },
  deviceTokenInvalid: {
    error: 'device_token_invalid',
    errorMessage: 'Device token invalid',
    status: StatusCode.BadRequest,
  },
  emailNotVerified: {
    error: 'email_not_verified',
    errorMessage: 'Email not verified',
    status: StatusCode.BadRequest,
  },
  cannotReviewYourOwnVendor: {
    error: 'cannot_review_your_own_vendor',
    errorMessage: 'Cannot review your own vendor',
    status: StatusCode.BadRequest,
  },
  occurrenceUpdateFailed: {
    error: 'occurrence_updated_failed',
    errorMessage: 'Occurrence update failed',
    status: StatusCode.BadRequest,
  },
  imageUploadFailed: {
    error: 'image_upload_failed',
    errorMessage: 'Image upload failed',
    status: StatusCode.BadRequest,
  },
  menuItemImageUploadFailed: {
    error: 'menu_item_image_upload_failed',
    errorMessage: 'Menu item image upload failed',
    status: StatusCode.BadRequest,
  },
  invalidEmailPasswordCombination: {
    error: 'invalid_email_password_combination',
    errorMessage: 'Invalid email/password combination',
    status: StatusCode.Unauthorized,
  },
  unauthorized: {
    error: 'unauthorized',
    errorMessage: 'Unauthorized',
    status: StatusCode.Unauthorized,
  },
  invalidToken: {
    error: 'invalid_token',
    errorMessage: 'Invalid token',
    status: StatusCode.Unauthorized,
  },
  userUpdateFailed: {
    error: 'user_update_failed',
    errorMessage: 'User update failed',
    status: StatusCode.Unauthorized,
  },
  routeNotFound: {
    error: 'route_not_found',
    errorMessage: 'Route not found',
    status: StatusCode.NotFound,
  },
  userNotFound: {
    error: 'user_not_found',
    errorMessage: 'User not found',
    status: StatusCode.NotFound,
  },
  usersNotFound: {
    error: 'users_not_found',
    errorMessage: 'Users not found',
    status: StatusCode.NotFound,
  },
  notificationNotFound: {
    error: 'notification_not_found',
    errorMessage: 'Notification not found',
    status: StatusCode.NotFound,
  },
  notificationsNotFound: {
    error: 'notifications_not_found',
    errorMessage: 'Notifications not found',
    status: StatusCode.NotFound,
  },
  deviceTokenNotFound: {
    error: 'device_token_not_found',
    errorMessage: 'Device token not found',
    status: StatusCode.NotFound,
  },
  tagNotFound: {
    error: 'tag_not_found',
    errorMessage: 'Tag not found',
    status: StatusCode.NotFound,
  },
  noVendorsFound: {
    error: 'no_vendors_found',
    errorMessage: 'No vendors found',
    status: StatusCode.NotFound,
  },
  reviewsNotFound: {
    error: 'reviews_not_found',
    errorMessage: 'Reviews not found',
    status: StatusCode.NotFound,
  },
  locationNotFound: {
    error: 'location_not_found',
    errorMessage: 'Location not found',
    status: StatusCode.NotFound,
  },
  vendorNotFound: {
    error: 'vendor_not_found',
    errorMessage: 'Vendor not found',
    status: StatusCode.NotFound,
  },
  vendorNotFavorited: {
    error: 'vendor_not_favorited',
    errorMessage: 'Vendor not favorited',
    status: StatusCode.NotFound,
  },
  vendorNotLive: {
    error: 'vendor_not_live',
    errorMessage: 'Vendor not live',
    status: StatusCode.NotFound,
  },
  reviewNotFound: {
    error: 'review_not_found',
    errorMessage: 'Review not found',
    status: StatusCode.NotFound,
  },
  occurrenceNotFound: {
    error: 'occurrence_not_found',
    errorMessage: 'Occurrence not found',
    status: StatusCode.NotFound,
  },
  menuItemNotFound: {
    error: 'menu_item_not_found',
    errorMessage: 'Menu item not found',
    status: StatusCode.NotFound,
  },
  reviewAlreadyExists: {
    error: 'review_already_exists',
    errorMessage: 'Review already exists',
    status: StatusCode.Conflict,
  },
  liveAlreadyStarted: {
    error: 'live_already_started',
    errorMessage: 'Live already started',
    status: StatusCode.Conflict,
  },
  vendorAlreadyFavorited: {
    error: 'vendor_already_favorited',
    errorMessage: 'Vendor already favorited',
    status: StatusCode.Conflict,
  },
  locationAlreadySaved: {
    error: 'location_already_saved',
    errorMessage: 'Location already saved',
    status: StatusCode.Conflict,
  },
  emailInUse: {
    error: 'email_in_use',
    errorMessage: 'Email already in use',
    status: StatusCode.Conflict,
  },
};

export const ResponseInfo = {
  accountDeleted: {
    message: 'Account deleted',
    status: StatusCode.Ok,
  },
  autocompleteSuccess: {
    message: 'Autocomplete successful',
    status: StatusCode.Ok,
  },
  notificationFound: {
    message: 'Notification found',
    status: StatusCode.Ok,
  },
  notificationsFound: {
    message: 'Notifications found',
    status: StatusCode.Ok,
  },
  tagsFound: {
    message: 'Tags found',
    status: StatusCode.Ok,
  },
  tagsNotFound: {
    message: 'Tags not found',
    status: StatusCode.NotFound,
  },
  notificationSent: {
    message: 'Notification sent',
    status: StatusCode.Ok,
  },
  sectionsFound: {
    message: 'Sections found',
    status: StatusCode.Ok,
  },
  tagUpdated: {
    message: 'Tag updated',
    status: StatusCode.Ok,
  },
  userFound: {
    message: 'User found',
    status: StatusCode.Ok,
  },
  usersFound: {
    message: 'Users found',
    status: StatusCode.Ok,
  },
  reviewsFound: {
    message: 'Reviews found',
    status: StatusCode.Ok,
  },
  verificationEmailSent: {
    message: 'Verification email sent',
    status: StatusCode.Ok,
  },
  verificationSuccessful: {
    message: 'Verification successful',
    status: StatusCode.Ok,
  },
  loginSuccessful: {
    message: 'Login successful',
    status: StatusCode.Ok,
  },
  credentialsVerified: {
    message: 'Credentials verified',
    status: StatusCode.Ok,
  },
  passwordResetEmailSent: {
    message: 'Password reset email sent',
    status: StatusCode.Ok,
  },
  vendorFound: {
    message: 'Vendor found',
    status: StatusCode.Ok,
  },
  vendorsFound: {
    message: 'Vendors found',
    status: StatusCode.Ok,
  },
  vendorUpdated: {
    message: 'Vendor updated',
    status: StatusCode.Ok,
  },
  occurrenceDeleted: {
    message: 'Occurrence deleted.',
    status: 200,
  },
  tagCreated: {
    message: 'Tag created',
    status: StatusCode.Created,
  },
  deviceTokenUpdated: {
    message: 'Device token updated',
    status: StatusCode.Created,
  },
  locationSaved: {
    message: 'Location saved',
    status: StatusCode.Created,
  },
  locationUnsaved: {
    message: 'Location unsaved',
    status: StatusCode.Created,
  },
  userUpdated: {
    message: 'User updated',
    status: StatusCode.Created,
  },
  vendorFavorited: {
    message: 'Vendor favorited',
    status: StatusCode.Created,
  },
  vendorUnfavorited: {
    message: 'Vendor unfavorited',
    status: StatusCode.Created,
  },
  passwordResetSuccessful: {
    message: 'Password reset successful',
    status: StatusCode.Created,
  },
  userCreated: {
    message: 'User created',
    status: StatusCode.Created,
  },
  vendorCreated: {
    message: 'Vendor created',
    status: StatusCode.Created,
  },
  occurrenceCreated: {
    message: 'Occurrence created',
    status: StatusCode.Created,
  },
  liveStarted: {
    message: 'Live started',
    status: StatusCode.Created,
  },
  reviewCreated: {
    message: 'Review created',
    status: StatusCode.Created,
  },
  imageCreated: {
    message: 'Image created',
    status: StatusCode.Created,
  },
  menuItemImageUploaded: {
    message: 'Menu item image uploaded',
    status: StatusCode.Created,
  },
  occurrenceUpdated: {
    message: 'Occurrence updated',
    status: StatusCode.Ok,
  },
  liveEnded: {
    message: 'Live ended',
    status: StatusCode.NoContent,
  },
  vendorDeleted: {
    message: 'Vendor deleted',
    status: StatusCode.NoContent,
  },
  reviewDeleted: {
    message: 'Review deleted',
    status: StatusCode.NoContent,
  },
};
