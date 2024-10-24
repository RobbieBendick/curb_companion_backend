import ILocation from './location';

export default interface IOccurrence {
  location?: ILocation;
  recurrence?: string[];
  start?: Date;
  end?: Date;
}
