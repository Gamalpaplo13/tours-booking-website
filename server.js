const mongoose = require('mongoose');
const app = require('./app');
const dotenv = require('dotenv');

process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION!!!!!!!!!');
  console.log(err.name, '------', err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
//get password from config
const DB = process.env.DATABASE.replace(
  '<DATABASE_PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
// connect to mongodb by mongoose
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    // useCreateIndex: true,
    useUnifiedTopology: true,
    // useFindAndModify: false,
  })
  .then(() => {
    console.log('DB connection successful!');
  });

const port = process.env.PORT || 8000;
const server = app.listen(port, () => {
  console.log(`app is listening at port : ${port}`);
});

process.on('unhandledRejection', (err) => {
  console.log(err);
  console.log('unhadler rejection!!!!!!!!!');
  server.close(() => {
    process.exit(1);
  });
});
