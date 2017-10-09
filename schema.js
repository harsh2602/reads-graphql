const fetch = require('node-fetch');
const util = require('util');
const parseXML = util.promisify(require('xml2js').parseString);
const {
  GraphQLSchema,
  GraphQLObjectType,
  GraphQLInt,
  GraphQLFloat,
  GraphQLString,
  GraphQLList
} = require('graphql');
const keys = require('./keys.js');

const BookType = new GraphQLObjectType({
  name: 'Books',
  description: 'Books for the author',
  fields: () => ({
    title: {
      type: GraphQLString,
      resolve: xml => xml.GoodreadsResponse.book[0].title[0]
    },
    isbn: {
      type: GraphQLString,
      resolve: xml => xml.GoodreadsResponse.book[0].isbn[0]
    },
    rating: {
      type: GraphQLFloat,
      resolve: xml => xml.GoodreadsResponse.book[0].average_rating[0]
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
        return Promise.all(
          ids.map(id =>
            fetch(
              `https://www.goodreads.com/book/show/${id}.xml?key=${keys.apiKey}`
            )
              .then(response => response.text())
              .then(parseXML)
          )
        );
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
        resolve: (root, args) =>
          fetch(
            `https://www.goodreads.com/author/show.xml?id=${args.id}&key=${keys.apiKey}`
          )
            .then(response => response.text())
            .then(parseXML)
      }
    })
  })
});
