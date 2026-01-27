 const express = require('express');

const { PORT } = require('./config');

const app = express();

const apiroutes=require('./routes');

app.use('/api',apiroutes);

app.listen(PORT, () => {
  console.log(`Successfully started the server on PORT : ${PORT}`);
});
