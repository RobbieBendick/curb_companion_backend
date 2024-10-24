import VendorDoc from '../models/landing-vendor';
import { ErrorResponse, ResponseInfo, sendErrorResponse, sendResponse } from '../shared/helpers/response';

const namespace = 'landing.create';

export async function create(req: any, res: any) {
  try {
    console.log(req.body);
    const vendor = await VendorDoc.create(req.body);
    return sendResponse({ req, res, namespace, data: vendor, ...ResponseInfo.vendorCreated });
  } catch (error) {
    console.log(error);
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
