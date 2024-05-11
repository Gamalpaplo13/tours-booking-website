const path = require('path');
const express = require('express');
const morgan = require('morgan');
const AppError = require('./Utilities/appError');
const tourRouter = require('./Routes/tourRoutes');
const userRouter = require('./Routes/userRoutes');
const reviewRouter = require('./Routes/reviewRoutes');
const viewRouter = require('./Routes/viewRoutes');
const bookingRouter = require('./Routes/bookingRoutes');
const globalErrorHandler = require('./Controllers/errorController');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { httpProxyMiddleware } = require('http-proxy-middleware');
const app = express();

//set up pug engine
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'Views'));

//  2) Global middleware

//serving static files
// app.use(express.static(`${__dirname}/public`));
app.use(express.static(path.join(__dirname, 'public')));

// set security http header
app.use(helmet());

// development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

//limit request for same ip
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, //  min * sec * ms
  message: 'Too many requests from this ip , please try again in an hour!',
});
app.use('/api', limiter);

// body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '10kb',
  }),
);
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
// Data sanitization against nosql query ingition -> clear data in req.body from attakers
app.use(cookieParser());
app.use(mongoSanitize());

// Data sanitization against XXS
app.use(xss());

//prevent parameter solution
app.use(
  hpp({
    whitelist: [
      'duration',
      'ratingsQuantity',
      'ratingsAverage',
      'maxGroupSize',
      'difficulty',
      'price',
    ],
  }),
);

// 3) ROUTES
app.use('/', viewRouter);
app.use('/api/v1/tours', tourRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/reviews', reviewRouter);
app.use('/api/v1/bookings', bookingRouter);
//handle querystrings dosent exsist
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);
module.exports = app;
