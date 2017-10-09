const express = require('express');
const graphqlHTTP = require('express-graphql');

const app = express();

// Schema is what contains type and information on how to get that data
const schema = require('./schema');

app.use(
  '/graphql',
  graphqlHTTP({
    schema,
    graphiql: true
  })
);

app.listen(4000);
console.log('Listening on port: 4000');
