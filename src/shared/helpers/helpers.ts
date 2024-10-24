import axios from 'axios';
import { GOOGLE_AUTOCOMPLETE } from '../../config/constants';

export function deepEquals(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) {
    return true;
  }

  if (typeof obj1 !== typeof obj2 || typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const key of keys1) {
    if (!deepEquals(obj1[key], obj2[key])) {
      return false;
    }
  }

  return true;
}

export async function googleAutocomplete(
  query: string,
  lat: string,
  lon: string,
  radius: string,
  type: string,
  sessiontoken: string,
) {
  try {
    const response: any = await axios.get(
      `${GOOGLE_AUTOCOMPLETE}?input=${query}&location=${lat}%2C${lon}&radius=${radius}&type=${type}&sessiontoken=${sessiontoken}&key=${process.env.GOOGLE_MAPS_API_KEY}`,
      {},
    );
    return response.data.predictions;
  } catch (error: any) {
    throw error;
  }
}
