import ILocation from './location';

export interface RegisterRequest {
  email: string;
  firstName: string;
  surname: string;
  phoneNumber: string;
  dateOfBirth: Date;
  password: string;
  confirmPassword: string;
  location?: ILocation;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceToken?: string;
}

export interface EmailVerificationRequest {
  email: string;
}

export interface GenericCodeRequest {
  email: string;
  code: number;
}

export interface ResetPasswordRequest {
  password: string;
  confirmPassword: string;
}

export interface ForgotPasswordResetRequest extends GenericCodeRequest, ResetPasswordRequest {}

export interface GenericOAuthRequest {
  identityToken: string;
  firstName?: string;
  surname?: string;
}

export interface GenericOAuthResponse {
  sub: string;
  email: string;
  emailVerified: boolean;
}

export interface GoogleOAuthRequest {
  id: string;
  email: string;
  displayName: string;
  photoUrl: string;
  accessToken: string;
  identityToken: string;
}

export interface AppleOAuthRequest {
  code: string;
  email?: string;
  firstName?: string;
  surname?: string;
  identityToken?: string;
}

export interface GenericOAuthUser extends GenericOAuthRequest, GenericOAuthResponse {}
