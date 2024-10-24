import { Aggregate, Document, Model, Schema, model } from 'mongoose';
import { rrulestr } from 'rrule';
import { EARTH_RADIUS_MILES } from '../config/constants';
import ILocation from '../shared/interfaces/location';
import IVendor from '../shared/interfaces/vendor';
import { VendorValidation } from '../validations/vendor-validation';
import { imageSchema } from './image-model';
import locationSchema, * as location_schema from './location-schema';
import MenuItem, { menuItemSchema } from './menu-item-model';
import { occurrenceSchema } from './occurrence-model';
import { reviewSchema } from './review-model';
import Tag, { tagSchema } from './tag-model';

export interface IVendorDocument extends IVendor, Document {
  updateTags: (tags: string[]) => Promise<void>;
  updateMenu: (menu: any[]) => Promise<void>;
  updateLocation: (location: any) => Promise<void>;
  updateSchedule: (schedule: any[]) => Promise<void>;
}

interface VendorModel extends Model<IVendorDocument> {
  findFavorited: (locationQuery: any, favorites: any, tagsQuery?: any) => Aggregate<any[]>;
  findByTagsAndTitle: (titleQuery: string) => Aggregate<any[]>;
  findByTagsAndTitleAndLocation: (titleQuery: string, locationQuery: any) => Aggregate<any[]>;
  findNearest: (locationQuery: any, tagsQuery?: any) => Aggregate<any[]>;
  findNewest: (locationQuery: any, tagsQuery?: any) => Aggregate<any[]>;
  mostPopular: (locationQuery: any, tagsQuery?: any) => Aggregate<any[]>;
  highestRated: (locationQuery: any, tagsQuery?: any) => Aggregate<any[]>;
}

const vendorSchema: Schema<IVendorDocument> = new Schema(
  {
    place_id: {
      type: String,
      required: false,
    },
    title: {
      type: String,
      required: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    email: {
      type: String,
      required: false,
    },
    website: {
      type: String,
      required: false,
    },
    phoneNumber: {
      type: String,
      required: false,
    },
    profileImage: {
      type: imageSchema,
      required: false,
    },
    images: {
      type: [imageSchema],
      default: [],
    },
    isCatering: {
      type: Boolean,
      required: true,
    },
    views: {
      type: Number,
      default: 0,
      required: false,
    },
    description: {
      type: String,
      required: false,
      maxlength: 500,
    },
    favorites: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [{ type: tagSchema, ref: 'Tag' }],
      default: [],
      required: false,
    },
    location: {
      type: locationSchema,
      required: false,
    },
    reviews: {
      type: [{ type: reviewSchema, ref: 'Review' }],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
    },
    menu: {
      type: [{ type: menuItemSchema, ref: 'MenuItem' }],
      default: [],
    },
    schedule: {
      type: [{ type: occurrenceSchema, ref: 'Occurrence' }],
      default: [],
    },
    live: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Live' }],
      default: [],
    },
    liveHistory: {
      type: [{ type: Schema.Types.ObjectId, ref: 'LiveHistory' }],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {},
);

vendorSchema.methods.updateMenu = async function (menu: any): Promise<void> {
  if (menu === undefined || menu.length === 0) return;

  for (var i = 0; i < menu.length; i++) {
    var found = false;
    VendorValidation.menuItem(menu[i]);
    for (var j = 0; j < this.menu.length; j++) {
      if (this.menu[j].title == menu[i].title) {
        found = true;
        break;
      }
    }
    if (!found) {
      let item = new MenuItem({
        vendorId: this.id,
        title: menu[i].title,
        type: menu[i].type,
        description: menu[i].description,
        price: menu[i].price,
      });
      if (menu.image !== undefined) {
        item.image = menu[i].image;
      }
      this.menu.push(item);
      await item.save();
    }
  }
};

vendorSchema.methods.updateTags = async function (tags: string[]): Promise<void> {
  if (tags) {
    for (let i = 0; i < tags.length; i++) {
      // Check if tag exists
      let result = await Tag.findOne({ title: tags[i] });
      if (result) {
        const index = this.tags.findIndex((tag: any) => tag._id?.toString() === result?._id.toString());
        if (index === -1) {
          this.tags.push(result);
        } else {
          this.tags.splice(index, 1);
        }
      }
    }
  }
};

vendorSchema.methods.updateSchedule = async function (schedule: any): Promise<void> {
  if (schedule === undefined || schedule.length === 0) return;

  for (var i = 0; i < schedule.length; i++) {
    var found = false;
    for (var j = 0; j < this.schedule.length; j++) {
      if (this.schedule[j].day == schedule[i].day) {
        found = true;
        break;
      }
    }
    if (!found) {
      this.schedule.push(schedule[i]);
    }
  }
};

vendorSchema.methods.updateLocation = async function (location: any): Promise<void> {
  const locationObj: ILocation | undefined = await location_schema.createILocation(location);
  this.location = locationObj;
};

vendorSchema.statics.findFavorited = function (locationQuery: any, favorites: any, tagsQuery: any): Aggregate<any[]> {
  const lst: any = [
    {
      $geoNear: {
        near: locationQuery.location.coordinates,
        spherical: true,
        distanceField: 'distance',
        key: 'location',
        distanceMultiplier: EARTH_RADIUS_MILES,
        maxDistance: locationQuery.radius / EARTH_RADIUS_MILES,
      },
    },
  ];
  if (tagsQuery) {
    lst.push({ $match: { $and: [{ _id: { $in: favorites } }, tagsQuery] } });
  } else {
    lst.push({ $match: { _id: { $in: favorites } } });
  }

  return this.aggregate(lst);
};

vendorSchema.statics.findByTagsAndTitle = function (titleQuery: string): Aggregate<any> {
  return this.aggregate([
    { $match: { $or: [{ title: { $regex: titleQuery, $options: 'i' } }, { tags: { $in: titleQuery.split(',') } }] } },
  ]);
};

vendorSchema.statics.findByTagsAndTitleAndLocation = function (titleQuery: string, locationQuery: any): Aggregate<any> {
  const lst: any = [
    {
      $geoNear: {
        near: locationQuery.location.coordinates,
        spherical: true,
        distanceField: 'distance',
        key: 'location',
        distanceMultiplier: EARTH_RADIUS_MILES,

        maxDistance: locationQuery.radius / EARTH_RADIUS_MILES,
      },
    },
    { $match: { $or: [{ title: { $regex: titleQuery, $options: 'i' } }, { tags: { $in: titleQuery.split(',') } }] } },
    { $sort: { distance: 1 } },
  ];
  return this.aggregate(lst);
};

vendorSchema.statics.findNearest = function (locationQuery: any, tagsQuery: any): Aggregate<any> {
  const lst: any = [
    {
      $geoNear: {
        near: locationQuery.location.coordinates,
        spherical: true,
        distanceField: 'distance',
        key: 'location',
        distanceMultiplier: EARTH_RADIUS_MILES,
        maxDistance: locationQuery.radius / EARTH_RADIUS_MILES,
      },
    },
    { $sort: { distance: 1 } },
  ];

  if (tagsQuery != null) {
    lst.push({ $match: tagsQuery });
  }
  return this.aggregate(lst);
};

vendorSchema.statics.findNewest = function (locationQuery: any, tagsQuery: any): Aggregate<any> {
  var date = new Date();
  const day = 24;
  const week = day * 7;
  date.setHours(date.getHours() - week);

  const lst: any = [
    {
      $geoNear: {
        near: locationQuery.location.coordinates,
        spherical: true,
        distanceField: 'distance',
        key: 'location',
        distanceMultiplier: EARTH_RADIUS_MILES,

        maxDistance: locationQuery.radius / EARTH_RADIUS_MILES,
      },
    },
    { $sort: { distance: 1, createdAt: -1 } },
  ];

  if (tagsQuery != null) {
    lst.push({ $match: tagsQuery });
  }

  return this.aggregate(lst);
};

vendorSchema.statics.mostPopular = function (locationQuery: any, tagsQuery: any): Aggregate<any> {
  const lst: any = [
    {
      $geoNear: {
        near: locationQuery.location.coordinates,
        spherical: true,
        distanceField: 'distance',
        key: 'location',
        distanceMultiplier: EARTH_RADIUS_MILES,

        maxDistance: locationQuery.radius / EARTH_RADIUS_MILES,
      },
    },
    { $sort: { views: -1, isOpen: -1, distance: 1 } },
  ];
  if (tagsQuery != null) {
    lst.push({ $match: tagsQuery });
  }
  return this.aggregate(lst);
};

vendorSchema.statics.highestRated = function (locationQuery: any, tagsQuery: any): Aggregate<any> {
  const lst: any = [
    {
      $geoNear: {
        near: locationQuery.location.coordinates,
        spherical: true,
        distanceField: 'distance',
        key: 'location',

        distanceMultiplier: EARTH_RADIUS_MILES,

        maxDistance: locationQuery.radius / EARTH_RADIUS_MILES,
      },
    },
    { $sort: { rating: -1, isOpen: -1, distance: 1 } },
  ];

  if (tagsQuery != null) {
    lst.push({ $match: tagsQuery });
  }

  return this.aggregate(lst);
};

vendorSchema.set('toJSON', { virtuals: true });
vendorSchema.set('toObject', { virtuals: true });

vendorSchema.virtual('isOpen').get(function () {
  const lives: any = this.live;
  const location: any = this.location;
  const schedule: any = this.schedule;
  if (lives.length > 0) {
    this.location!.address = lives[0].location.address;
    location.coordinates[0] = lives[0].location.coordinates[0];
    location.coordinates[1] = lives[0].location.coordinates[1];
    return true;
  } else if (schedule.length > 0) {
    for (let i = 0; i < schedule.length; i++) {
      if (schedule[i].recurrence && schedule[i].recurrence.length > 0) {
        const rrule = rrulestr(schedule[i].recurrence.join('\n'));

        // 1. Check if the current date is within the occurrence bounds.
        const started = rrule.options.dtstart.getTime() <= Date.now();
        let ended = false;
        if (rrule.options.until) {
          ended = rrule.options.until.getTime() >= Date.now();
        }
        const occurrenceBounds = started && !ended;
        if (!occurrenceBounds) return false;

        // 2. Check if the current date is within the recurrence bounds.
        const beginDayTime = new Date(Date.now());
        beginDayTime.setUTCDate(beginDayTime.getUTCDate() - 1);
        beginDayTime.setUTCHours(0);
        beginDayTime.setUTCMinutes(0);
        beginDayTime.setUTCSeconds(0);

        const endDayTime = new Date(Date.now());
        endDayTime.setUTCDate(endDayTime.getUTCDate() + 1);
        endDayTime.setUTCHours(23);
        endDayTime.setUTCMinutes(59);
        endDayTime.setUTCSeconds(59);

        const btwn = rrule.between(beginDayTime, endDayTime, true);

        if (btwn.length > 0) {
          for (let j = 0; j < btwn.length; j++) {
            const openTime = new Date(btwn[j]);
            openTime.setUTCHours(schedule[i].start.getUTCHours());
            openTime.setUTCMinutes(schedule[i].start.getUTCMinutes());
            openTime.setUTCSeconds(schedule[i].start.getUTCSeconds());

            const closeTime = new Date(btwn[j]);
            if (schedule[i].end.getUTCDate() > schedule[i].start.getUTCDate()) {
              closeTime.setUTCDate(closeTime.getUTCDate() + 1);
            }
            closeTime.setUTCHours(schedule[i].end.getUTCHours());
            closeTime.setUTCMinutes(schedule[i].end.getUTCMinutes());
            closeTime.setUTCSeconds(schedule[i].end.getUTCSeconds());

            if (new Date(Date.now()) >= openTime && new Date(Date.now()) <= closeTime) {
              this.location!.address = schedule[i].location.address;
              location.coordinates[0] = schedule[i].location.coordinates[0];
              location.coordinates[1] = schedule[i].location.coordinates[1];
              return true;
            }
          }
        }
      }
    }
    return false;
  }
  return false;
});

vendorSchema.index({ location: '2dsphere' });

const Vendor = model<IVendorDocument, VendorModel>('Vendor', vendorSchema);
export default Vendor;
