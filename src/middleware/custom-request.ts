import { Request } from 'express';
import formidable from 'formidable';

export interface CustomRequest extends Request {
  fields?: formidable.Fields;
}
