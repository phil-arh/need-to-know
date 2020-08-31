const debug = require('debug')('ntk:schema');

module.exports = {
  __version: '1.0',
  admin: {
    users: {
      create: {
        WHEN(doc, opts) { return true; },
        FIELDS(doc, opts) { return true; },
      },
      read: {
        WHEN(doc, opts) { debug('running'); return false; },
        FIELDS(doc, opts) { return true; },
      },
      update: {
        WHEN(doc, opts) { return true; },
        FIELDS(doc, opts) { return true; },
      },
      delete: {
        WHEN(doc, opts) { return true; },
        FIELDS(doc, opts) { return true; },
      },
    },
  },
  sales: {
    customers: {
      create: {
        WHEN(doc, opts) { return true; },
        FIELDS(doc, opts) { return true; },
      },
      read: {
        WHEN(doc, opts) { return doc.rep === opts.username; },
        FIELDS(doc, opts) { return true; },
      },
    },
  },
};
