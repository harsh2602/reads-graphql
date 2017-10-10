const fetch = require('node-fetch');
const util = require('util');
const parseXML = util.promisify(require('xml2js').parseString);
const DataLoader = require('dataloader');
const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList
} = require('graphql');
const keys = require('./keys');

const translateLang = (lang, str) => {
  // Google Translate API is a paid (but dirt cheap) service.
  // To generate your own API key, go here: https://cloud.google.com/translate/v2/getting_started
  const url = `https://www.googleapis.com/language/translate/v2?key=${keys.googleTransalateApiKey}&source=en&target=${lang}&q=encodeURIComponent(${str})`;
  return fetch(url)
    .then(response => response.json())
    .then(parsedResponse => parsedResponse.data.translations[0].translatedText);
};

const fetchAuthor = id =>
  fetch(`https://www.goodreads.com/author/show.xml?id=${id}&key=${keys.apiKey}`)
    .then(response => response.text())
    .then(parseXML);

const fetchBooks = id =>
  fetch(`https://www.goodreads.com/book/show/${id}.xml?key=${keys.apiKey}`)
    .then(response => response.text())
    .then(parseXML);

// Author loader
const authorLoader = new DataLoader(keys =>
  Promise.all(keys.map(key => fetchAuthor(key)))
);

// Books loader
const bookLoader = new DataLoader(keys =>
  Promise.all(keys.map(key => fetchBooks(key)))
);

const BookType = new GraphQLObjectType({
  name: 'Books',
  description: 'Books for the author',
  fields: () => ({
    title: {
      type: GraphQLString,
      args: {
        lang: { type: GraphQLString }
      },
      resolve: (xml, args) => {
        const title = xml.GoodreadsResponse.book[0].title[0];
        return args.lang ? translateLang(args.lang, title) : title;
      }
    },
    isbn: {
      type: GraphQLString,
      resolve: xml => xml.GoodreadsResponse.book[0].isbn[0]
    },
    rating: {
      type: GraphQLFloat,
      resolve: xml => xml.GoodreadsResponse.book[0].average_rating[0]
    },
    authors: {
      type: new GraphQLList(AuthorType),
      resolve: xml => {
        const authorElements = xml.GoodreadsResponse.book[0].authors[0].author;
        const ids = authorElements.map(elem => elem.id[0]);
        return authorLoader.loadMany(ids);
      }
    }
  })
});

const AuthorType = new GraphQLObjectType({
  name: 'Author',
  description: 'Author details',
  fields: () => ({
    name: {
      type: GraphQLString,
      resolve: xml => xml.GoodreadsResponse.author[0].name[0]
    },
    books: {
      type: new GraphQLList(BookType),
      // Imitating lazy fetching using the books API
      resolve: xml => {
        const ids = xml.GoodreadsResponse.author[0].books[0].book.map(
          elem => elem.id[0]._
        );
        return bookLoader.loadMany(ids);
      }
    }
  })
});

module.exports = new GraphQLSchema({
  query: new GraphQLObjectType({
    name: 'Query',
    description: 'goodreads schema',
    fields: () => ({
      author: {
        type: AuthorType,
        args: {
          id: { type: GraphQLInt }
        },
        resolve: (root, args) => authorLoader.load(args.id)
      }
    })
  })
});
