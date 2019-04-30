const stampit = require('@stamp/it');
const { grab } = require('../apiHelper');
const { setGlobalSession, getGlobalSession } = require('../globalSession');

// Make sure we have the sessionStamp withSessionHandling method AND appLogCommon
const stamp = stampit({
  methods: {
    /**
     * Returns the currently stored sessionKey for this client instance
     * @private
     * @return {string}  the sessionKey, if any
     */
    getSessionKey() {
      return this.config.sessionKey;
    },

    /**
     * sets the global or the client instance sessionPromise
     * @private
     * @param {promise} sessionPromise the new session promise
     * @returns {void}
     */
    setSessionPromise(sessionPromise) {
      const { useSharedSession } = this.config;
      if (useSharedSession) {
        setGlobalSession(sessionPromise);
      } else {
        this.sessionPromise = sessionPromise;
      }
    },

    /**
     * returns the global or the client instance sessionPromise
     * @private
     * @returns {promise} the current session promise
     */
    getSessionPromise() {
      const { useSharedSession } = this.config;
      return useSharedSession ? getGlobalSession() : this.sessionPromise;
    },

    /**
     * creates a session.
     * Note you do not usually need to worry about this. Other methods will call
     * it automatically for you when it is needed.
     * @return {promise}  a promise of a string, the sessionKey
     */
    createSession() {
      const currentSessionPromise = this.getSessionPromise();
      /*
       * return the current session promise if present.
       * useful in order to avoid requesting a session while already
       * holding a valid sessionKey
       */
      if (currentSessionPromise) {
        return currentSessionPromise;
      }

      // otherwise launch the session request & update the sessionPromise
      const sessionPromise = grab('/session', this.config)
        .then(({ sessionKey }) => {
          this.config.sessionKey = sessionKey;
          return sessionKey;
        })
        .catch(err => {
          // cleans the failed sessionPromise
          this.setSessionPromise(null);
          throw err;
        });

      this.setSessionPromise(sessionPromise);
      return sessionPromise;
    },

    /**
     * invalidates client session
     * @private
     * @return {void}
     */
    clearCurrentSession() {
      this.config.sessionKey = null;
      this.setSessionPromise(null);
    },

    /**
     * refreshes the session when request error is of Authorization
     * kind and reperform the request.
     * @private
     * @param {object} res the api response
     * @param {function} next a function that returns a promise
     * @returns {promise} a promise of the result of the next function
     */
    refreshAndRefetch(res, next) {
      if (res && res.status === 401) {
        return this.getSessionPromise()
          .then(newSessionKey => {
            if (newSessionKey === this.getSessionKey()) {
              /*
               * refreshing the session only if `getSessionPromise` resolves to
               * the same value as before. This is necessary to avoid duplicating
               * session requests while performing concurrent data fetching.
               */
              this.clearCurrentSession();
              return this.createSession();
            }
            this.config.sessionKey = newSessionKey;
            return newSessionKey;
          })
          .then(next);
      }
      throw res;
    },

    /**
     * If sessionKey is found trough sessionPromise, calls the next function, then:
     * - If this failed with a 401 (unauthorized), create a session then retry
     * - Otherwise returns a promise of that function's results
     * If there was no sessionKey, create a session before attempting the next function.
     * @private
     * @param {function} next a function that returns a promise
     * @return {promise}  a promise of the result of the next function
     */
    withSessionHandling(next) {
      return Promise.resolve(this.getSessionPromise()).then(sessionKey => {
        this.config.sessionKey = sessionKey;
        if (!sessionKey) {
          return this.createSession().then(next);
        }

        return next().catch(res => this.refreshAndRefetch(res, next));
      });
    },
  },
});

module.exports = stamp;
