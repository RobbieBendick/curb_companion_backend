import 'jest';
import { distance, time } from '../math';

describe('Math Helpers', () => {
  describe('distance', () => {
    describe('milesBetween', () => {
      test('should return the correct distance between two points', () => {
        const distanceInMiles = distance.milesBetween(33.7489954, -84.3879824, 33.7489954, -84.3879824);
        expect(distanceInMiles).toBe(0);
      });
    });
    describe('deg2rad', () => {
      test('should return the correct radian value', () => {
        const radian = distance.deg2rad(180);
        expect(radian).toBe(Math.PI);
      });
    });
  });

  describe('time', () => {
    describe('minutesToMilliseconds', () => {
      test('should return the correct time in minutes', () => {
        const timeInMinutes = time.millisecondsToMinutes(60000);
        expect(timeInMinutes).toBe(1);
      });
    });
    describe('millisecondsToMinutes', () => {
      test('should return the correct time in milliseconds', () => {
        const timeInMilliseconds = time.minutesToMilliseconds(1);
        expect(timeInMilliseconds).toBe(60000);
      });
    });
  });
});
