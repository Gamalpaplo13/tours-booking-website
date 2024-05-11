const express = require('express');
const bookingController = require('../Controllers/bookingController');
const authController = require('../Controllers/authController');
const app = require('../app');

const router = express.Router();

router.use('/', authController.protect);

router.get('checkout-session/:tourId', bookingController.getCheckoutSession);

router.use('/', authController.restrictTo('admin', 'lead-guide'));

router
  .route('/')
  .get(bookingController.getAllBooking)
  .post(bookingController.createBooking);

router
  .route('/:id')
  .get(bookingController.getBooking)
  .delete(bookingController.deleteBooking)
  .patch(bookingController.updateBooking);

module.exports = router;
