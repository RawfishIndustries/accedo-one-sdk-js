const stampit = require('@stamp/it');
const { grab } = require('../apiHelper');
const { setGlobalSession, getGlobalSession } = require('../globalSession');

// Make sure we have the sessionStamp withSessionHandling method AND appLogCommon
const stamp = stampit({
  init(_, { instance }) {
    // the promise of a session being created
    let creatingSessionPromise;

    const { useSharedSession } = instance.config;

    function setClientSession(value) {
      creatingSessionPromise = value;
    }

    function getClientSession() {
      return creatingSessionPromise;
    }

    /*
     if useSharedSession is truthy, use functions to get & set 
     a global session promise instead of the client specific one
    */
    const setSessionPromise = useSharedSession
      ? setGlobalSession
      : setClientSession;

    const getSessionPromise = useSharedSession
      ? getGlobalSession
      : getClientSession;

    function resolveSessionKey(sessionKey) {
      // update the context of this client, adding the session key
      if (instance.config.sessionKey !== sessionKey) {
        // performing comparison to avoid useless `onSessionKeyChanged` invocations
        instance.config.sessionKey = sessionKey;
      }
      // we're no longer creating a session
      return sessionKey;
    }

    /**
     * Create a session and store it for reuse in this client instance
     * Note you do not usually need to worry about this. Other methods will call
     * it automatically for you when it is needed.
     * @return {promise}  a promise of a string, the sessionKey
     */
    instance.createSession = function createSession() {
      const sessionPromise = getSessionPromise();
      // if we have a promise of a session, return it
      if (sessionPromise) {
        return sessionPromise.then(resolveSessionKey);
      }

      // ignore any existing session
      if (instance.config.sessionKey) {
        instance.config.sessionKey = null;
      }

      // launch a request, update the promise
      const promise = grab('/session', instance.config)
        .then(({ sessionKey }) => sessionKey)
        .then(resolveSessionKey)
        .catch(err => {
          // we're no longer creating a session
          setSessionPromise(null);
          throw err;
        });

      setSessionPromise(promise);

      return getSessionPromise();
    };
  },
  methods: {
    /**
     * Returns the currently stored sessionKey for this client instance
     * @return {string}  the sessionKey, if any
     */
    getSessionKey() {
      return this.config.sessionKey;
    },

    /**
     * Cleans the global invalid session if useSharedSession flag is active,
     * in order to avoid resolving the old global session promise in createSession
     * @returns {void}
     */
    cleanInvalidSession() {
      if (this.config.useSharedSession) {
        setGlobalSession(null);
      }
    },

    /**
     * If a sessionKey exists, calls the next function, then:
     * - If this failed with a 401 (unauthorized), create a session then retry
     * - Otherwise returns a promise of that function's results
     * If there was no sessionKey, create one before attempting the next function.
     * @private
     * @param {function} next a function that returns a promise
     * @return {promise}  a promise of the result of the next function
     */
    withSessionHandling(next) {
      // existing session
      if (this.getSessionKey()) {
        return next().catch(res => {
          if (res && res.status === 401) {
            // clean global session when necessary
            this.cleanInvalidSession();
            // session expired - recreate one then retry
            return this.createSession().then(next);
          }
          // otherwise propagate the failure
          throw res;
        });
      }
      // no session - create it first, then launch the next action
      return this.createSession().then(next);
    },
  },
});

module.exports = stamp;
