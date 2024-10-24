import { Aggregate, Schema, Types, model } from 'mongoose';
import { EARTH_RADIUS_MILES } from '../config/constants';
import IEvent from '../shared/interfaces/event';
import locationSchema from './location-schema';

// TODO: This whole schema

const eventSchema: Schema<IEvent> = new Schema(
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
      type: Types.ObjectId,
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
    image: {
      type: String,
      required: false,
    },
    images: {
      type: [String],
      default: [],
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
    location: locationSchema,
    reviews: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Review' }],
      default: [],
    },
    rating: {
      type: Number,
      default: 0,
    },
    schedule: {
      type: [{ type: Schema.Types.ObjectId, ref: 'Occurrence' }],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {},
);

/**
 * Find the nearest events.
 * @param {{String, [Number]}} location The location.
 * @param {Function} callback The callback function.
 * @returns {Event[]} The events that match the query.
 */
eventSchema.statics.findNearest = function (locationQuery: any, tagsQuery: any): Aggregate<any> {
  let lst: any = [
    {
      $geoNear: {
        near: locationQuery.location.coordinates,
        spherical: true,
        distanceField: 'distance',
        distanceMuliplier: EARTH_RADIUS_MILES,
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

eventSchema.set('toJSON', { virtuals: true });
eventSchema.set('toObject', { virtuals: true });

// eventSchema.virtual('isOpen').get(function() {
//     let lives: any = this.live;
//     let location: any = this.location;
//     let schedule: any = this.schedule;
//         if (lives.length > 0) {
//             this.address = lives[0].address;
//             location.coordinates[0] = lives[0].location.coordinates[0];
//             location.coordinates[1] = lives[0].location.coordinates[1];
//             return true;
//         } else if (schedule.length > 0) {
//             for (let i = 0; i < schedule.length; i++) {
//                 if (schedule[i].recurrence.length > 0) {
//                     let rrule = rrulestr(schedule[i].recurrence.join('\n'));

//                     // 1. Check if the current date is within the occurrence bounds.
//                     let started = rrule.options.dtstart.getTime() <= Date.now();
//                     let ended = false;
//                     if (rrule.options.until) {
//                         ended = rrule.options.until.getTime() >= Date.now();
//                     }
//                     let occurrenceBounds = started && !ended;
//                     if (!occurrenceBounds) return false;

//                     // 2. Check if the current date is within the recurrence bounds.
//                     let beginDayTime = new Date(Date.now());
//                     beginDayTime.setUTCHours(0);
//                     beginDayTime.setUTCMinutes(0);
//                     beginDayTime.setUTCSeconds(0);

//                     let endDayTime = new Date(Date.now());
//                     endDayTime.setUTCDate(endDayTime.getUTCDate() + 1);
//                     endDayTime.setUTCHours(23);
//                     endDayTime.setUTCMinutes(59);
//                     endDayTime.setUTCSeconds(59);

//                     let btwn = rrule.between(beginDayTime, endDayTime, true);

//                     if (btwn.length > 0) {

//                         let openTime = new Date(Date.now());
//                         openTime.setUTCHours(schedule[i].start.getUTCHours());
//                         openTime.setUTCMinutes(schedule[i].start.getUTCMinutes());
//                         openTime.setUTCSeconds(schedule[i].start.getUTCSeconds());

//                         let closeTime = new Date(Date.now());
//                         if (schedule[i].end.getUTCDate() > schedule[i].start.getUTCDate()) {
//                             closeTime.setUTCDate(closeTime.getUTCDate() + 1);
//                         }
//                         closeTime.setUTCHours(schedule[i].end.getUTCHours());
//                         closeTime.setUTCMinutes(schedule[i].end.getUTCMinutes());
//                         closeTime.setUTCSeconds(schedule[i].end.getUTCSeconds());

//                         if (Date.now() >= openTime.getTime() && Date.now() <= closeTime.getTime()) {
//                             this.address = schedule[i].address;
//                             location.coordinates[0] = schedule[i].location.coordinates[0];
//                             location.coordinates[1] = schedule[i].location.coordinates[1];
//                             return true;

//                         }
//                     }
//                 }
//                 else return false;
//             }
//             return false;
//         }
//         return false;
//     });

eventSchema.index({ location: '2dsphere' });

/**
 * The event model.
 * @model
 * @var {String} title The title of the event.
 * @var {ObjectId} ownerId The ID of the ownerId of the event.
 * @var {String} email The email of the event.
 * @var {String} website The website of the event.
 * @var {String} phoneNumber The phone number of the user.
 * @var {String} image The location (as a URL) of the image of the event.
 * @var {Number} views The number of views of the event.
 * @var {String} description The description of the event.
 * @var {String} address The address of the event.
 * @var {Boolean} isOpen Whether the event is open.
 * @var {Number} reviewCount The number of reviews of the event.
 * @var {[Review]} reviews The reviews of the event.
 * @var {Number} rating The rating of the event.
 * @var {[Live]} live The lives of the event.
 * @var {[LiveHistory]} liveHistory The past lives of the event.
 * @var {Date} createdAt The creation date of the event.
 */
const Event = model<IEvent>('Event', eventSchema);
export default Event;
