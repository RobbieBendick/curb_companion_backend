import { Request, Response } from 'express';
import { DEFAULT_RADIUS_MILES } from '../config/constants';
import User from '../models/user-model';
import Vendor from '../models/vendor-model';
import { ErrorResponse, ResponseInfo, sendErrorResponse, sendResponse } from '../shared/helpers/response';
import { HomeQuery } from '../shared/interfaces/vendor';
import { VendorValidation } from '../validations/vendor-validation';

const baseNamespace: string = 'home-controller';

export async function generateHomeSections(req: Request, res: Response) {
  const namespace: string = `${baseNamespace}.generateHomeSections`;
  try {
    const sections = new Map();

    const params: HomeQuery = req.query;

    const { error } = VendorValidation.generateHomeSections(params);
    if (error !== undefined) {
      return sendErrorResponse({
        req,
        res,
        namespace,
        ...ErrorResponse.validationErrors,
        validationErrors: error.details,
      });
    }

    if (params.lon === undefined || params.lat === undefined) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.locationRequired });
    }

    let radius: number = Number(params.radius ? params.radius : DEFAULT_RADIUS_MILES);

    // Set up the location query.
    const locationQuery = {
      location: {
        type: 'Point',
        coordinates: [Number(params.lon), Number(params.lat)],
      },
      radius: Number(radius),
    };

    let userFavorites;
    // Get user favorites and sort them by open status.
    const user = await User.findById(req.body.userId);
    if (user) userFavorites = user.favorites.sort((a: any, b: any) => (a.isOpen && b.isOpen ? 0 : a.isOpen ? -1 : 1));

    let favorites, nearest, newest, mostPopular, highestRated;

    // Make database queries based on the tags.
    let tagsData = params.tags as String;

    // TODO: Refactor to where each section takes the HomeQuery object and builds the aggregation there based on the given fields
    if (tagsData) {
      const tags = { 'tags.title': { $in: tagsData.split(',') } };
      if (userFavorites) favorites = await Vendor.findFavorited(locationQuery, userFavorites, tags);
      nearest = await Vendor.findNearest(locationQuery, tags);
      newest = await Vendor.findNewest(locationQuery, tags);
      mostPopular = await Vendor.mostPopular(locationQuery, tags);
      highestRated = await Vendor.highestRated(locationQuery, tags);
    } else {
      if (userFavorites) favorites = await Vendor.findFavorited(locationQuery, userFavorites);
      nearest = await Vendor.findNearest(locationQuery);
      newest = await Vendor.findNewest(locationQuery);
      mostPopular = await Vendor.mostPopular(locationQuery);
      highestRated = await Vendor.highestRated(locationQuery);
    }

    function createHomeSection(sectionTitle: string, vendors: any[]) {
      if (!vendors || vendors.length === 0) return null;
      vendors = vendors.map((d) => {
        return Vendor.hydrate(d);
      });
      sections.set(sectionTitle, vendors);
    }

    // Add each section to the map if it exists. Hydrate each vendor, so that the virtual fields are populated.
    if (favorites) createHomeSection('Favorites', favorites);
    createHomeSection('Nearest', nearest);
    createHomeSection('Newest', newest);
    createHomeSection('Most popular', mostPopular);
    createHomeSection('Highest rated', highestRated);

    if (sections.size === 0) {
      return sendErrorResponse({ req, res, namespace, ...ErrorResponse.noVendorsFound });
    }

    return sendResponse({ req, res, namespace, ...ResponseInfo.sectionsFound, data: Object.fromEntries(sections) });
  } catch (error: any) {
    console.log(error);
    return sendErrorResponse({ req, res, namespace, ...ErrorResponse.internalServerError, stacktrace: error });
  }
}
