const express = require('express');

const { serverConfig,loggersConfig} = require('./config');

const app = express();

const apiroutes=require('./routes');

app.use(express.json());

app.use(express.urlencoded({extended:true}))

app.use('/api',apiroutes);

app.listen(serverConfig.PORT, () => {
  console.log(`Successfully started the server on PORT : ${serverConfig.PORT}`);
  loggersConfig.info("Successfully started the server", {});

});
