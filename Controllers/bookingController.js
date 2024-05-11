const AppError = require('../Utilities/appError');
const Tour = require('../models/tourModel');
const Booking = require('../Models/bookingModel');
const APIFeatures = require('../Utilities/APIFeatuers');
const catchAsync = require('../Utilities/catchAsync');
const handlerFactory = require('./handlerFactory');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
  // 1) get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  // 2) create checkout session
  const session = await stripe.checkout.sessions.create({
    // information about the session
    payment_method_types: ['card'],
    //not secure
    success_url: `${req.protocol}://${req.get('host')}/?tour=${
      req.params.tourId
    }&user=${req.user.id}&price=${tour.price}`,
    cancel_url: `${req.protocol}://${req.get('host')}/tour/${tour.slug}`,
    customer_email: req.user.email,
    client_reference_id: req.params.tourId,
    // information about the product that the user about to buy
    line_items: [
      {
        name: `${tour.name}Tour`,
        description: tour.summary,
        images: [`https://www.natours.dev/img/tours/${tour.imageCover}`],
        amount: tour.price * 100,
        currency: 'usd',
        quantity: 1,
      },
    ],
  });

  // 3) send it to client
  res.status(200).json({
    status: 'sucess',
    session,
  });
});

exports.createBookingCheckout = catchAsync(async (req, res, next) => {
  //temporary ,because it unsecure , reveryone can booking without paying
  const { tour, user, price } = req.query;
  if (!tour && !user && !price) return next();
  await Booking.create({ tour, user, price });
  //new req with new url
  res.redirect(req.originalUrl.split('?')[0]);
});

exports.createBooking = handlerFactory.createOne(Booking);
exports.getBooking = handlerFactory.getOne(Booking);
exports.getAllBooking = handlerFactory.getAll(Booking);
exports.updateBooking = handlerFactory.updateOne(Booking);
exports.deleteBooking = handlerFactory.deleteOne(Booking);
