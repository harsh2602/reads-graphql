const fetch = require('node-fetch');
const util = require('util');
const parseXML = util.promisify(require('xml2js').parseString);
const express = require('express');
const graphqlHTTP = require('express-graphql');
const DataLoader = require('dataloader');

const app = express();

const keys = require('./keys');

// Schema is what contains type and information on how to get that data
const schema = require('./schema');

const fetchAuthor = id =>
  fetch(`https://www.goodreads.com/author/show.xml?id=${id}&key=${keys.apiKey}`)
    .then(response => response.text())
    .then(parseXML);

const fetchBooks = id =>
  fetch(`https://www.goodreads.com/book/show/${id}.xml?key=${keys.apiKey}`)
    .then(response => response.text())
    .then(parseXML);

app.use(
  '/graphql',
  graphqlHTTP(req => {
    // Create loaders on every request

    // Author loader
    const authorLoader = new DataLoader(keys =>
      Promise.all(keys.map(key => fetchAuthor(key)))
    );

    // Books loader
    const bookLoader = new DataLoader(keys =>
      Promise.all(keys.map(key => fetchBooks(key)))
    );

    return {
      schema,
      context: {
        authorLoader,
        bookLoader
      },
      graphiql: true
    };
  })
);

app.listen(4000);
console.log('Listening on port: 4000');
