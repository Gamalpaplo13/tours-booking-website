const { promisify } = require('util');
const User = require('./../Models/userModel');
const catchAsync = require('./../Utilities/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../Utilities/appError');
const Email = require('./../Utilities/email');
const crypto = require('crypto');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000,
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  //remove the pass from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token: token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
  });

  const url = `${req.protocol}://${req.get('host')}/me`;

  await new Email(newUser, url).sendWelcome();
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  //1) check if email and password exists
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  //2) check if user exists && password is correct
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  //3) if everything ok,send token to client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  return res.status(200).json({
    status: 'success',
  });
};
exports.protect = catchAsync(async (req, res, next) => {
  //1) get the token and check if it's exisits
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('you are not logged in!', 401));
  }
  //2) verification token
  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  //3) check if user still exists
  const freshUser = await User.findById(decode.id);
  if (!freshUser) {
    return next(new AppError('THE TOKEN not exists', 401));
  }
  //4) check if user changed password after the token was issued
  if (freshUser.changedPasswordAfter(decode.iat)) {
    return next(
      new AppError('user recently changed password please login again', 401),
    );
  }
  // grant access to protected route
  req.user = freshUser;
  res.locals.user = freshUser;

  next();
});
// only for render pages , no errors
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      //1) verfiy token
      const decode = await util.promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET,
      );

      //3) check if user still exists
      const freshUser = await User.findById(decode.id);
      if (!freshUser) {
        return next();
      }

      //4) check if user changed password after the token was issued
      if (freshUser.changedPasswordAfter(decode.iat)) {
        return next();
      }
      // there is a logged in user
      //in templates there are variable called user
      res.locals.user = freshUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    //roles ['admin, ...]arr
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('you dont have permission to perform this action', 403),
      );
    }
    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // get user based on psted email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('THERE IS NO USER WITH EMAIL ADDRESS', 404));
  }
  // generate the random token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  //send it to user's email
  try {
    const resetURL = `${req.protocol}://${req.get(
      'host',
    )}/api/v1/users/resetPassword/${resetToken}`;
    await new Email(user, resetURL).sendPasswordReset();
    res.status(200).json({
      status: 'success',
      message: 'TOKEN SENT TO EMAIL',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return next(new AppError(' THERE IS AN ERROR SENDING AN EMAIL', 500));
  }
});
exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on the token
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const userBasedToken = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) if token not expired and there is user then reset pass
  if (!userBasedToken) {
    return next(new AppError('TOKEN IS EXPIRED', 400));
  }
  userBasedToken.password = req.body.password;
  userBasedToken.passwordConfirm = req.body.passwordConfirm;
  userBasedToken.passwordResetToken = undefined;
  userBasedToken.passwordResetExpires = undefined;
  await userBasedToken.save();

  //3) update change password at property for the user

  //4) login the user and send JWT
  createSendToken(userBasedToken, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  // 1) get user from collection
  const user = await User.findById(req.user.id).select('+password');
  //2) check if posted password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('your current password is wrong', 401));
  }
  //3)update pass
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  //4) log userin and send JWT
  createSendToken(user, 200, res);
});
