const fetch = require('isomorphic-unfetch');
const factory = require('../../src/node/index');

const idToFetch = '56ea7bd6935f75032a2fd431';

const makeClient = sessionKeyInQueryString =>
  factory({
    appKey: '56ea6a370db1bf032c9df5cb',
    deviceId: 'gregTestingSDK',
    sessionKeyInQueryString,
  });

const hasSessionQS = mock => {
  return mock.calls.some(
    ([arg0]) => arg0.includes('?sessionKey=') || arg0.includes('&sessionKey=')
  );
};

const hasSessionHeader = mock => {
  return mock.calls.some(([, arg1 = {}]) => {
    const { headers = {} } = arg1;
    return headers['X-SESSION'];
  });
};

describe('"sessionKeyInQueryString" flag Tests...', () => {
  describe('With truthy sessionKeyInQueryString flag...', () => {
    const client = makeClient(true);

    test('should have no "X-SESSION" header', () => {
      fetch.mockClear();
      return client.getEntryById(idToFetch).then(() => {
        expect(hasSessionHeader(fetch.mock)).toBeFalsy();
      });
    });

    test('should have sessionKey in query params', () => {
      fetch.mockClear();
      return client.getEntryById(idToFetch).then(() => {
        expect(hasSessionQS(fetch.mock)).toBeTruthy();
      });
    });
  });

  describe('With falsy sessionKeyInQueryString flag...', () => {
    const client = makeClient(false);

    test('should have "X-SESSION" header', () => {
      fetch.mockClear();
      return client.getEntryById(idToFetch).then(() => {
        expect(hasSessionHeader(fetch.mock)).toBeTruthy();
      });
    });

    test('should have no "sessionKey" in query params', () => {
      fetch.mockClear();
      return client.getEntryById(idToFetch).then(() => {
        expect(hasSessionQS(fetch.mock)).toBeFalsy();
      });
    });
  });
});
