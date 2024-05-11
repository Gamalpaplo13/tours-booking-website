const AppError = require('../Utilities/appError');
const catchAsync = require('./../Utilities/catchAsync');
const Review = require('./../Models/reviewsModel');
const factory = require('./handlerFactory');

exports.setTourUserIds = (res, req, next) => {
  if (!req.body.tour) req.body.tour = req.params.tourId;
  if (!req.body.user) req.body.user = req.user.id;
  next();
};

exports.getAllReviews = factory.getAll(Review);
exports.getReview = factory.getOne(Review);
exports.deleteReview = factory.deleteOne(Review);
exports.updateReview = factory.updateOne(Review);
exports.createReview = factory.createOne(Review);

// catchAsync(async (req, res, next) => {
//   let filter = {};
//   if (req.params.tourId) filter = { tour: req.params.tourId };
//   const reviews = await Review.find(filter);
//   res.status(200).json({
//     status: 'success',
//     results: reviews.length,
//     data: {
//       reviews,
//     },
//   });
// });
// exports.createReview = catchAsync(async (req, res, next) => {
//   //allow nested routes

//   const newReview = await Review.create(req.body);
//   res.status(200).json({
//     status: 'success',
//     data: {
//       review: newReview,
//     },
//   });
// });
