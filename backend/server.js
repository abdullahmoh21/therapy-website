require('dotenv').config();
const express = require('express');
const app = express(); 
const path = require('path');

const {logger} = require('./middleware/logEvents'); 
const errorHandler  = require('./middleware/errorHandler');
const credentials = require('./middleware/credentials');
const verifyJWT = require('./middleware/verifyJWT');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConfig');

const cors = require('cors');
const corsOptions = require('./config/corsOptions');

const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 3200;

connectDB();


//----------------- MIDDLEWARE ------------------//
app.use(express.json());  //middleware for  JSON payloads requests
app.use(express.urlencoded({ extended: true }));   //middleware for urlencoded  requests 
app.use(cookieParser());  //middleware for cookies requests 
app.use(logger);
app.use(credentials)
app.use(cors(corsOptions)); 
// ----------------------------------------------//



//----------------- ENDPOINTS------------------//
app.use('/auth', require('./endpoints/authEndpoints'));
app.use('/users', require('./endpoints/userEndpoints'));
// ---------------------------------------------//


// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't match one above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Error handler
app.use(errorHandler); 

//only listen when connection to database is open
mongoose.connection.on('open', () => {
  console.log('Mongoose connected');
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});

mongoose.connection.on('error', (err) => {
  console.log(err)
  logEvents(`${err.no}: ${err.code}\t${err.syscall}\t${err.hostname}`, 'mongoErrLog.txt')
})