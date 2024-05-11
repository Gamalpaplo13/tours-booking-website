const mongoose = require('mongoose');
const Tour = require('./../models/tourModel');
const reviewsSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'review cant be empty'],
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      select: false,
    },
    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'tour',
      required: [true, 'review must belong to a tour'],
    },
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'review must belong to a User'],
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewsSchema.index({ tour: 1, user: 1 }, { unique: true });

reviewsSchema.pre(/^find/, function (next) {
  // this.populate({
  //   path: 'tourReview',
  //   select: 'name',
  // }).populate({
  //   path: 'userReview',
  //   select: 'name photo',
  // });
  // next();
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

reviewsSchema.statics.clacAverageRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId },
    },
    {
      $group: {
        _id: '$tour',
        numberOfRatings: { $sum: 1 },
        averageOfRatings: { $avg: 'rating' },
      },
    },
  ]);
  if (stats.length > 0) {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].numberOfRatings,
      ratingsAverage: stats[0].averageOfRatings,
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5,
    });
  }
};

reviewsSchema.post('save', function (next) {
  this.constructor.Review.clacAverageRatings(this.tour);
  next();
});

reviewsSchema.pre(/^findOneAnd/, async function (next) {
  this.r = await this.findOne();
});
1;
reviewsSchema.post(/^findOneAnd/, async function (next) {
  await this.r.constructor.clacAverageRatings(this.r.tour);
});

const Review = mongoose.model('Review', reviewsSchema);

module.exports = Review;
