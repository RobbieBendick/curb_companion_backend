import Joi, { ValidationResult } from 'joi';
import {
  AppleOAuthRequest,
  ForgotPasswordResetRequest,
  GenericCodeRequest,
  EmailVerificationRequest as GenericEmailRequest,
  GenericOAuthResponse,
  GoogleOAuthRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from '../shared/interfaces/auth';

// TODO: Refactor to functional programming style + reuse schemas

export module AuthValidation {
  const passwordSchema = Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]+$'))
    .required()
    .label('Password')
    .messages({
      'string.pattern.base':
        '{{#label}} must contain at least one lowercase letter, one uppercase letter, one digit, and one special character',
    });

  const confirmPasswordSchema = Joi.string().valid(Joi.ref('password')).required().label('Confirm Password').messages({
    'any.only': '{{#label}} does not match Password',
  });

  const codeSchema = Joi.number().min(100000).max(999999).required();

  export function loginRequest(data: LoginRequest): ValidationResult<any> {
    return Joi.object({
      email: Joi.string().required().email(),
      password: passwordSchema,
      deviceToken: Joi.string().optional(),
    }).validate(data);
  }

  export function registerRequest(data: RegisterRequest): ValidationResult<any> {
    return Joi.object({
      email: Joi.string().required().email(),
      firstName: Joi.string().required(),
      surname: Joi.string().required(),
      dateOfBirth: Joi.date().required(),
      gender: Joi.string().optional(),
      location: Joi.string().optional(),
      phoneNumber: Joi.string().required(),
      password: passwordSchema,
      confirmPassword: confirmPasswordSchema,
    }).validate(data);
  }
  export function genericEmailRequest(data: GenericEmailRequest): ValidationResult<any> {
    return Joi.object({
      email: Joi.string().required().email(),
    }).validate(data);
  }

  /**
   * Validator for generic code requests.
   *
   * @param {GenericCodeRequest} data - The generic code request data to be validated.
   * @returns {ValidationResult<any>} - The result of the validation.
   */
  export function genericCodeRequest(data: GenericCodeRequest): ValidationResult<any> {
    return Joi.object({
      email: Joi.string().required().email(),
      code: codeSchema,
    }).validate(data);
  }

  export function resetPasswordRequest(data: ResetPasswordRequest): ValidationResult<any> {
    return Joi.object({
      password: passwordSchema,
      confirmPassword: confirmPasswordSchema,
    }).validate(data);
  }

  export function forgotPasswordResetRequest(data: ForgotPasswordResetRequest): ValidationResult<any> {
    return Joi.object({
      email: Joi.string().required().email(),
      code: codeSchema,
      password: passwordSchema,
      confirmPassword: confirmPasswordSchema,
    }).validate(data);
  }

  export function googleOAuthRequest(data: GoogleOAuthRequest): ValidationResult<any> {
    return Joi.object({
      id: Joi.string().required(),
      email: Joi.string().required(),
      displayName: Joi.string().required(),
      photoUrl: Joi.string().optional(),
      accessToken: Joi.string().required(),
      identityToken: Joi.string().required(),
    }).validate(data);
  }

  export function appleOAuthRequest(data: AppleOAuthRequest): ValidationResult<any> {
    return Joi.object({
      code: Joi.string().required(),
      email: Joi.string().optional(),
      firstName: Joi.string().optional(),
      surname: Joi.string().optional(),
      identityToken: Joi.string().optional(),
    }).validate(data);
  }

  export function genericOAuthResponse(data: GenericOAuthResponse): ValidationResult<any> {
    return Joi.object({
      sub: Joi.string().required(),
      email: Joi.string().required().email(),
      emailVerified: Joi.boolean().required(),
    }).validate(data);
  }
}
