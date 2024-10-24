import { EARTH_RADIUS_MILES } from '../../config/constants';

export module distance {
  export function calculateMinMaxCoordinates(
    latitude: number,
    longitude: number,
    radius: number,
  ): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
    const earthRadius = 3958.8; // Earth's radius in miles

    // Convert radius to radians
    const radiusInRadians = radius / earthRadius;

    // Convert latitude and longitude to radians
    const latRad = (latitude * Math.PI) / 180;
    const lonRad = (longitude * Math.PI) / 180;

    // Calculate the minimum and maximum latitude
    const minLat = latRad - radiusInRadians;
    const maxLat = latRad + radiusInRadians;

    // Calculate the minimum and maximum longitude
    const deltaLon = Math.asin(Math.sin(radiusInRadians) / Math.cos(latRad));
    const minLon = lonRad - deltaLon;
    const maxLon = lonRad + deltaLon;

    let minLatDeg = (minLat * 180) / Math.PI;
    let maxLatDeg = (maxLat * 180) / Math.PI;
    let minLonDeg = (minLon * 180) / Math.PI;
    let maxLonDeg = (maxLon * 180) / Math.PI;

    if (minLatDeg > maxLatDeg) {
      const temp = minLatDeg;
      minLatDeg = maxLatDeg;
      maxLatDeg = temp;
    }

    if (minLonDeg > maxLonDeg) {
      const temp = minLonDeg;
      minLonDeg = maxLonDeg;
      maxLonDeg = temp;
    }

    return { minLat: minLatDeg, maxLat: maxLatDeg, minLon: minLonDeg, maxLon: maxLonDeg };
  }

  export function milesBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
    var dLat: number = deg2rad(lat2 - lat1); // deg2rad below
    var dLon: number = deg2rad(lon2 - lon1);
    var a: number =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d: number = EARTH_RADIUS_MILES * c; // Distance in mi
    return d;
  }

  export function deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}

export module time {
  export function millisecondsToMinutes(ms: number): number {
    return ms / 60000;
  }

  export function minutesToMilliseconds(min: number): number {
    return min * 60000;
  }
}
