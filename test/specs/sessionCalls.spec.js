const fetch = require('isomorphic-unfetch');
const factory = require('../../src/node/index');
const { setGlobalSession } = require('../../src/globalSession');

const numberOfClients = 10;
const appKey = '56ea6a370db1bf032c9df5cb';
const deviceId = 'gregTestingSDK';

const resetGlobalSession = () => setGlobalSession(null);
const invalidateGlobalSession = () =>
  setGlobalSession(Promise.resolve('invalidSessionKey'));

const makeClient = useSharedSession => {
  return factory({
    appKey,
    deviceId,
    useSharedSession,
  });
};

const makeClients = useSharedSession => {
  return [...Array(numberOfClients).keys()].map(() =>
    makeClient(useSharedSession)
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
    test('should make session call once for each client, with falsy `useSharedSession`', () => {
      fetch.mockClear();
      const clients = makeClients();
      const promises = clients.map(c => c.createSession());
      return Promise.all(promises).then(() => {
        expect(getNumberOfSessionCalls(fetch.mock)).toBe(numberOfClients);
      });
    });
    test('should make session call just once, with truthy `useSharedSession`', () => {
      resetGlobalSession();
      fetch.mockClear();
      const clients = makeClients(true);
      const promises = clients.map(c => c.createSession());
      return Promise.all(promises).then(() => {
        expect(getNumberOfSessionCalls(fetch.mock)).toBe(1);
      });
    });
  });

  describe('With client instantiated after a session is created...', () => {
    test('should make session call just once, with truthy `useSharedSession`', () => {
      resetGlobalSession();
      fetch.mockClear();
      const clientA = makeClient(true);
      return clientA
        .createSession()
        .then(() => {
          const clientB = makeClient(true);
          return clientB.createSession();
        })
        .then(() => {
          expect(getNumberOfSessionCalls(fetch.mock)).toBe(1);
        });
    });
  });

  describe('After session invalidation, with falsy `useSharedSession`...', () => {
    test('should refresh session only once, with concurrent requests', () => {
      fetch.mockClear();
      const client = makeClient();
      return client
        .getAllMetadata()
        .then(() => {
          client._invalidateSession();
          return Promise.all([
            client.getAllMetadata(),
            client.getAllMetadata(),
          ]);
        })
        .then(() => {
          expect(getNumberOfSessionCalls(fetch.mock)).toBe(2);
        });
    });
  });

  describe('After session invalidation, with truthy `useSharedSession`...', () => {
    test('should invalidate and refresh global session', () => {
      resetGlobalSession();
      fetch.mockClear();
      const client = makeClient(true);
      return client
        .getAllMetadata()
        .then(() => {
          client._invalidateSession();
          setGlobalSession(Promise.resolve('invalidSessionKey'));
          return client.getAllMetadata();
        })
        .then(() => {
          expect(getNumberOfSessionCalls(fetch.mock)).toBe(2);
        });
    });

    test('should refresh global session once, with a new client`', () => {
      resetGlobalSession();
      fetch.mockClear();
      const clientA = makeClient(true);
      return clientA
        .getAllMetadata()
        .then(() => {
          invalidateGlobalSession();
          const clientB = makeClient(true);
          return clientB.getAllMetadata();
        })
        .then(() => {
          expect(getNumberOfSessionCalls(fetch.mock)).toBe(2);
        });
    });

    test('should refresh global session once, with multiple new clients`', () => {
      resetGlobalSession();
      fetch.mockClear();
      const clientA = makeClient(true);
      return clientA
        .getAllMetadata()
        .then(() => {
          invalidateGlobalSession();
          const clientB = makeClient(true);
          const clientC = makeClient(true);
          return Promise.all([
            clientB.getAllMetadata(),
            clientC.getAllMetadata(),
          ]);
        })
        .then(() => {
          expect(getNumberOfSessionCalls(fetch.mock)).toBe(2);
        });
    });
  });
});
