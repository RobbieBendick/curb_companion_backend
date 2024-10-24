import { Request, Response } from 'express';
import { googleAutocomplete } from '../shared/helpers/helpers';
import { ErrorResponse, ResponseInfo, sendErrorResponse, sendResponse } from '../shared/helpers/response';
import { AutocompleteQuery } from '../shared/interfaces/vendor';

const baseNamespace: string = 'search-controller';

export async function autocomplete(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.autocomplete`;
  try {
    let { q, lat, lon, radius, sessiontoken } = req.query;
    const autocompleteQuery: AutocompleteQuery = {
      q: q as string,
      lat: lat as string,
      lon: lon as string,
      radius: radius as string,
      sessiontoken: sessiontoken as string,
    };

    const data: any = await googleAutocomplete(
      autocompleteQuery.q,
      autocompleteQuery.lat,
      autocompleteQuery.lon,
      autocompleteQuery.radius,
      'address',
      autocompleteQuery.sessiontoken,
    );
    return sendResponse({ req, res, namespace, data, ...ResponseInfo.autocompleteSuccess });
  } catch (error: any) {
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
