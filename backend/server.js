const express = require('express');
const  {logger} = require('./middleware/logEvents'); 
const  errorHandler  = require('./middleware/errorHandler');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const app = express(); 

const path = require('path');
const PORT = process.env.PORT || 3500;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(logger);


app.use(cors(corsOptions));  

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// The "catchall" handler: for any request that doesn't match one above
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});

// Error handler
app.use(errorHandler); 

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));