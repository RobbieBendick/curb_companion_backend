import IAddress from './address';

export default interface ILocation {
  type?: string;
  coordinates?: number[];
  address?: IAddress;
  accuracy?: number;
  altitude?: number;
}
