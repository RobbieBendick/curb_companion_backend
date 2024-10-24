import { ValidationResult } from 'joi';
import Joi from 'joi';
import { GenericVendorRequest, HomeQuery, VendorQuery } from '../shared/interfaces/vendor';

// TODO: Refactor to functional programming style + reuse schemas

export module VendorValidation {
  // TODO: Position schema validation
  // TODO: Location schema validation
  // TODO: Address schema validation
  const latSchemaOptional = Joi.number().min(-90).max(90);
  const lonSchemaOptional = Joi.number().min(-180).max(180);
  const latSchema = Joi.number().min(-90).max(90).required();
  const lonSchema = Joi.number().min(-180).max(180).required();
  const radiusSchema = Joi.number().optional().min(0).max(3958.8);

  export function create(data: any): ValidationResult<any> {
    return Joi.object({
      title: Joi.string().required(),
      email: Joi.string().optional().email(),
      website: Joi.string().optional(),
      phoneNumber: Joi.string().optional(),
      isCatering: Joi.boolean().required(),
      description: Joi.string().optional().max(500),
      location: Joi.object().optional(),
    }).validate(data);
  }

  export function update(data: any): ValidationResult<any> {
    return Joi.object({
      title: Joi.string().optional(),
      email: Joi.string().optional().email(),
      website: Joi.string().optional(),
      phoneNumber: Joi.string().optional(),
      isCatering: Joi.boolean().optional(),
      tags: Joi.array().optional(),
      description: Joi.string().optional().max(500),
      menu: Joi.array().optional(),
      address: Joi.string().optional(),
    }).validate(data);
  }

  export function menuItem(data: any): ValidationResult<any> {
    return Joi.object({
      title: Joi.string().required(),
      description: Joi.string().optional(),
      price: Joi.number().optional(),
      type: Joi.string().required(),
      image: Joi.string().optional(),
    }).validate(data);
  }

  export function createReview(data: any): ValidationResult<any> {
    return Joi.object({
      title: Joi.string().min(5).max(50).required(),
      description: Joi.string().min(10).max(500).required(),
      rating: Joi.number().min(0).max(5).required(),
    }).validate(data);
  }

  export function goLive(data: any): ValidationResult<any> {
    return Joi.object({
      location: Joi.object().required(),
    }).validate(data);
  }

  export function occurrence(data: any): ValidationResult<any> {
    return Joi.object({
      recurrence: Joi.array().optional(),
      location: Joi.object().optional(),
      start: Joi.string().required(),
      end: Joi.string().required(),
    }).validate(data);
  }

  export function findVendor(data: VendorQuery): ValidationResult<any> {
    return Joi.object({
      ownerId: Joi.string().optional(),
      title: Joi.string().optional(),
      tags: Joi.string().optional(),
      lat: latSchemaOptional,
      lon: lonSchemaOptional,
      radius: radiusSchema,
      catering: Joi.boolean().optional(),
      rating: Joi.number().min(0).max(5).optional(),
      q: Joi.string().optional(),
      skip: Joi.number().optional(),
      limit: Joi.number().optional(),
    })
      .and('lat', 'lon')
      .validate(data);
  }

  export function generateHomeSections(data: HomeQuery): ValidationResult<any> {
    return Joi.object({
      lat: latSchema,
      lon: lonSchema,
      radius: radiusSchema,
      tags: Joi.string().optional().allow(''),
      filters: Joi.string().optional().allow(''),
    }).validate(data);
  }

  export function genericVendorRequest(data: GenericVendorRequest): ValidationResult<any> {
    return Joi.object({ id: Joi.string() }).validate(data);
  }
}
