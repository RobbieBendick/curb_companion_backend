import { NextFunction, Request, Response } from 'express';
import formidable from 'formidable';
import { CustomRequest } from './custom-request';

export function formFieldsMiddleware(req: CustomRequest, res: Response, next: NextFunction) {
  const form = formidable();

  form.parse(req, (error, fields, files) => {
    if (error) {
      return res.status(500).send('An error occurred while processing the form data.');
    }

    req.body = JSON.parse(fields.data as string);

    req.files = files as any;

    next();
  });
}
