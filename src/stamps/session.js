const stampit = require('@stamp/it');
const { grab } = require('../apiHelper');
const { setGlobalSession, getGlobalSession } = require('../globalSession');

// Make sure we have the sessionStamp withSessionHandling method AND appLogCommon
const stamp = stampit({
  init(_, { instance }) {
    // the promise of a session being created
    let instanceSessionPromise;

    const { useSharedSession } = instance.config;

    function setClientSession(value) {
      instanceSessionPromise = value;
    }

    function getClientSession() {
      return instanceSessionPromise;
    }

    /*
     if useSharedSession is truthy, use functions to get & set 
     a global session promise instead of the client specific one
    */
    instance.setSessionPromise = useSharedSession
      ? setGlobalSession
      : setClientSession;

    instance.getSessionPromise = useSharedSession
      ? getGlobalSession
      : getClientSession;

    instance.updateConfigSessionKey = function updateConfigSessionKey(
      sessionKey
    ) {
      if (instance.config.sessionKey !== sessionKey) {
        instance.config.sessionKey = sessionKey;
      }
    };

    /**
     * Create a session and store it for reuse in this client instance
     * Note you do not usually need to worry about this. Other methods will call
     * it automatically for you when it is needed.
     * @return {promise}  a promise of a string, the sessionKey
     */
    instance.createSession = function createSession() {
      // returns current session promise if present
      const currentSessionPromise = this.getSessionPromise();
      if (currentSessionPromise) {
        return currentSessionPromise;
      }

      // otherwise launch a request, update the promise
      const sessionPromise = grab('/session', instance.config)
        .then(({ sessionKey }) => {
          this.updateConfigSessionKey(sessionKey);
          return sessionKey;
        })
        .catch(err => {
          // we're no longer creating a session
          this.setSessionPromise(null);
          throw err;
        });

      this.setSessionPromise(sessionPromise);
      return sessionPromise;
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
     * refreshes the session when needed and reperform the
     * request
     * @param {object} res the api response
     * @param {function} next a function that returns a promise
     * @returns {promise} a promise of the result of the next function
     */
    refreshAndRefetch(res, next) {
      if (res && res.status === 401) {
        /* 
         * authentication error found. 
         * check if promise still resolves to a new value,
         * otherwise updates the sessionPromise by creating a new session
         */
        return this.getSessionPromise()
          .then(newSessionKey => {
            // returns a correct sessionKey
            if (newSessionKey === this.getSessionKey()) {
              this.setSessionPromise(null);
              this.updateConfigSessionKey(null);
              return this.createSession();
            }
            this.updateConfigSessionKey(newSessionKey);
            return newSessionKey;
          })
          .then(next);
      }
      throw res;
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
      return Promise.resolve(this.getSessionPromise()).then(sessionKey => {
        this.updateConfigSessionKey(sessionKey);
        if (!sessionKey) {
          return this.createSession().then(next);
        }

        return next().catch(res => this.refreshAndRefetch(res, next));
      });
    },
  },
});

module.exports = stamp;
