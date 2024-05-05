const express = require('express');
const app = express(); 
const path = require('path');
const  {logger} = require('./middleware/logEvents'); 
const  errorHandler  = require('./middleware/errorHandler');
const credentials = require('./middleware/credentials');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const cookieParser = require('cookie-parser');
const PORT = process.env.PORT || 3500;


// Middleware
app.use(express.json());  //middleware for  JSON payloads requests
app.use(express.urlencoded({ extended: true }));   //middleware for urlencoded  requests 
app.use(cookieParser());  //middleware for cookies requests 
app.use(logger);

app.use(credentials)
app.use(cors(corsOptions));  

//routes
app.use('/auth', require('./routes/auth'));
app.use('/register',require('./routes/register'))
app.use('/refresh', require('./routes/refresh'));
app.use('/logout', require('./routes/logout'));

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't match one above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Error handler
app.use(errorHandler); 

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));