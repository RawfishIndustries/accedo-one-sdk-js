const fetch = require('isomorphic-unfetch');

// useful to track fetch calls
const mockedFetch = jest.fn(fetch);

module.exports = mockedFetch;
