const factory = require('../../src/node/index');
const apiHelper = require('../../src/apiHelper');

describe('Session API Tests', () => {
  const onSessionKeyChanged = jest.fn();
  const client = factory({
    appKey: '56ea6a370db1bf032c9df5cb',
    deviceId: 'gregTestingSDK',
    onSessionKeyChanged,
  });

  test('getSessionKey should return a falsy value at first', () => {
    const key = client.getSessionKey();
    expect(key).toBeFalsy();
  });

  test('should not have called onSessionKeyChanged yet', () => {
    expect(onSessionKeyChanged).not.toBeCalled();
  });

  test('createSession should return a session key', () => {
    return client.createSession().then(response => {
      expect(typeof response).toBe('string');
    });
  });

  test('should have called onSessionKeyChanged by now', () => {
    expect(onSessionKeyChanged).toBeCalled();
  });

  test('getSessionKey should return a string value after a session was attached to the client', () => {
    const key = client.getSessionKey();
    expect(typeof key).toBe('string');
  });

  describe('With concurrent calls by one same client...', () => {
    const onSessionKeyChangedB = jest.fn();
    const clientB = factory({
      appKey: '56ea6a370db1bf032c9df5cb',
      deviceId: 'gregTestingSDK',
      onSessionKeyChanged: onSessionKeyChangedB,
    });

    test('should only create one session and propagate it to all clients', () => {
      return Promise.all([
        clientB.createSession(),
        clientB.createSession(),
        clientB.createSession(),
      ]).then(([key1, key2, key3]) => {
        expect(key1).toBe(key2);
        expect(key1).toBe(key3);
        expect(onSessionKeyChangedB.mock.calls.length).toBe(1);
      });
    });

    test('should call session endpoint only once', () => {
      const spy = jest.spyOn(apiHelper, 'grab');
      return Promise.all([
        clientB.createSession(),
        clientB.createSession(),
        clientB.createSession(),
      ]).then(() => {
        const sessionCalls = spy.mock.calls.filter(
          ([path]) => path === '/session'
        );
        expect(sessionCalls.length).toBe(1);
        spy.mockRestore();
      });
    });
  });

  describe('With concurrent calls by multiple clients...', () => {
    const numberOfClients = 10;
    const sessionKey = 'invalidSessionKey';
    const appKey = '56ea6a370db1bf032c9df5cb';
    const deviceId = 'gregTestingSDK';

    const getTestClients = reuseSession =>
      [...Array(10).keys()].map(() => {
        return factory({
          reuseSession,
          appKey,
          deviceId,
          sessionKey,
        });
      });

    test('should reuse the same sessionId', () => {
      const clients = getTestClients();
      const promises = clients.map(c => c.createSession());
      return Promise.all(promises).then(() => {
        const [clientA] = clients;
        clients.forEach(c =>
          expect(clientA.getSessionKey()).toBe(c.getSessionKey())
        );
      });
    });

    describe('Should call sessionEndpoint...', () => {
      test('once for each client, with falsy `reuseSession`', () => {
        const clients = getTestClients();
        const spy = jest.spyOn(apiHelper, 'grab');
        const promises = clients.map(c => c.createSession());
        return Promise.all(promises).then(() => {
          const sessionCalls = spy.mock.calls.filter(
            ([path]) => path === '/session'
          );
          expect(sessionCalls.length).toBe(numberOfClients);
          spy.mockRestore();
        });
      });

      test('only once, with truthy `reuseSession`', () => {
        const clients = getTestClients(true);
        const spy = jest.spyOn(apiHelper, 'grab');
        const promises = clients.map(c => c.createSession());
        return Promise.all(promises)
          .then(() => {
            const sessionCalls = spy.mock.calls.filter(
              ([path]) => path === '/session'
            );
            expect(sessionCalls.length).toBe(1);
            spy.mockRestore();
          })
          .catch(error => {
            console.error(error);
            throw error;
          });
      });
    });
  });
});
