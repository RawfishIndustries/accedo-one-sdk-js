const factory = require('../../src/node/index');
const fetch = require('isomorphic-unfetch');

const numberOfClients = 10;
const sessionKey = 'invalidSessionKey';
const appKey = '56ea6a370db1bf032c9df5cb';
const deviceId = 'gregTestingSDK';

const makeClient = () => {
  return factory({
    appKey,
    deviceId,
  });
};

const makeClients = reuseSameSession => {
  return [...Array(numberOfClients).keys()].map(() =>
    factory({
      reuseSameSession,
      appKey,
      deviceId,
      sessionKey,
    })
  );
};

const getNumberOfSessionCalls = mock => {
  return mock.calls.filter(([path]) => path.includes('/session')).length;
};

describe('Session service calls Tests...', () => {
  describe('With concurrent calls by single client...', () => {
    test('should call session endpoint only once', () => {
      const client = makeClient();
      fetch.mockClear();
      return Promise.all([
        client.createSession(),
        client.createSession(),
        client.createSession(),
      ]).then(() => {
        expect(getNumberOfSessionCalls.length).toBe(1);
      });
    });
  });

  describe('With concurrent calls by multiple clients...', () => {
    test('should make session call once for each client, with falsy `reuseSameSession`', () => {
      fetch.mockClear();
      const clients = makeClients();
      const promises = clients.map(c => c.createSession());
      return Promise.all(promises).then(() => {
        expect(getNumberOfSessionCalls(fetch.mock)).toBe(numberOfClients);
      });
    });

    test('should make session call just once, with truthy `reuseSameSession`', () => {
      fetch.mockClear();
      const clients = makeClients(true);
      const promises = clients.map(c => c.createSession());
      return Promise.all(promises).then(() => {
        expect(getNumberOfSessionCalls(fetch.mock)).toBe(1);
      });
    });
  });
});
