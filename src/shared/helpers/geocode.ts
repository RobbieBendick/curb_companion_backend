import axios, { AxiosError } from 'axios';
import { GOOGLE_GEOCODE } from '../../config/constants';
import IAddress from '../interfaces/address';
import ILocation from '../interfaces/location';

export async function fromAddress(address: IAddress): Promise<undefined | ILocation> {
  try {
    // Geocode
    let { street, city, state, country, postalCode } = address;
    let splitAddresses = `${street.split(' ').join('+')},+${city},+${state}+${postalCode},${country}`;

    // Hit Google API
    let data = await axios.get(`${GOOGLE_GEOCODE}?address=${splitAddresses}&key=${process.env.GOOGLE_MAPS_API_KEY}`);
    // Set resulting lat, lon to our schema - [lon, lat] cuz of mongoDookieBase
    if (data.data.results.length > 0) {
      let result = data.data.results[0];

      let { lat, lng: lon } = result.geometry.location;

      let [streetNumber, street, city, county, state, country, postalCode] = result.address_components;

      const addressObj: IAddress = {
        street: `${streetNumber.long_name} ${street.long_name}`,
        city: city.long_name,
        state: state.short_name,
        country: country.short_name,
        postalCode: postalCode.long_name,
      };

      const locationObj: ILocation = { coordinates: [lon, lat], address: addressObj, type: 'Point' };

      return locationObj;
    } else {
      throw Error('Invalid address');
    }
  } catch (error: any) {
    if (error instanceof AxiosError) {
      if (error.code === '400') {
        throw new Error('Invalid Position');
      }
    }
  }
}

export async function fromPosition(position: { latitude: number; longitude: number }): Promise<ILocation | undefined> {
  try {
    // Reverse Geocode
    let data = await axios.get(
      `${GOOGLE_GEOCODE}?latlng=${position.latitude},${position.longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
    );
    if (data.data.results.length > 0) {
      let result = data.data.results[0];

      // Check for invalid position
      if (result.types.length == 1) {
        if (result.types[0] == 'plus_code') {
          throw new Error('Invalid position');
        }
      }

      // Set resulting address to our schema
      let [streetNumber, street, city, county, state, country, postalCode] = result.address_components;

      const addressObj: IAddress = {
        street: `${streetNumber.long_name} ${street.long_name}`,
        city: city.long_name,
        state: state.short_name,
        country: country.short_name,
        postalCode: postalCode.long_name,
      };

      const locationObj: ILocation = {
        coordinates: [position['longitude'], position['latitude']],
        address: addressObj,
        type: 'Point',
      };

      return locationObj;
    }
    throw new Error('Invalid position');
  } catch (error) {
    if (error instanceof AxiosError) {
      if (error.code === '400') {
        throw new Error('Invalid Position');
      }
    }
  }
}
