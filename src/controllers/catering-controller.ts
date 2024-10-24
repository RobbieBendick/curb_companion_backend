import { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import CateringRequest, { ICateringRequest } from '../models/catering-request';
import { ErrorResponse, sendErrorResponse, sendResponse } from '../shared/helpers/response';
import User from '../models/user-model';

const baseNamespace: string = 'catering-controller';

export async function createCateringRequest(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.createCateringRequest`;
  try {
    const { email, subject, description }: ICateringRequest = req.body;
    const cateringRequest = new CateringRequest({
      email,
      subject,
      description,
    });

    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_ADDRESS,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    await transporter.sendMail({
      from: `"Curb Companion" <${process.env.SMTP_DOMAIN_ADDRESS}>`,
      to: cateringRequest.email,
      subject: 'Curb Companion - Catering Request Confirmation - noreply',
      text: `Thank you for the catering request!\n\n
                `,
      html: `<p>Thank you for the catering request!</p>
                <p>&nbsp;</p>
                <p>We will be in touch shortly.</p>`,
    });

    const users = await User.find({ roles: { $in: ['ADMIN'] } });

    if (users.length > 0) {
      const to = users.map((u) => u.email);
      await transporter.sendMail({
        from: `"Curb Companion" <${process.env.SMTP_DOMAIN_ADDRESS}>`,
        to,
        subject: 'Curb Companion - Catering Request Created - noreply',
        text: `A catering request has been created!\n\n
                `,
        html: `<p>A catering request has been created!</p>
                <p>&nbsp;</p>
                <p>Please resolve this catering request.</p>`,
      });
    }

    await cateringRequest.save();
    return sendResponse({ req, res, message: 'Catering request created', data: cateringRequest, namespace });
  } catch (err) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: err });
  }
}
