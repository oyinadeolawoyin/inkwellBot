require('dotenv').config();
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'info' },
      { emit: 'event', level: 'warn' },
      { emit: 'event', level: 'error' }
    ],
});

const SLOW_QUERY_THRESHOLD = 350;
// Wrap Prisma $on query to include useful info
prisma.$on('query', (e) => {
    // Ignore internal SELECT 1 queries
    if (e.query.trim() === 'SELECT 1') return;
  
    if (e.duration > SLOW_QUERY_THRESHOLD) {
      // Try to extract the table name from the query
      const tableMatch = e.query.match(/FROM ["`]?(public)?["`]?\.(["`]?\w+["`]?)\s?/i);
      const tableName = tableMatch ? tableMatch[2] : 'UnknownTable';
  
      console.log('----- SLOW QUERY DETECTED -----');
      console.log(`Duration: ${e.duration}ms`);
      console.log(`Table: ${tableName}`);
      console.log(`SQL: ${e.query}`);
      console.log(`Params: ${JSON.stringify(e.params)}`);
      console.log('--------------------------------');
    }
});

module.exports = prisma;