const sessionStamp = require('./session');
const api = require('../apiHelper');

// Make sure we have the sessionStamp withSessionHandling method
const stamp = sessionStamp.compose({
  methods: {
    /**
     * Get the profile information
     * @return {promise}  a promise of the requested data
     */
    getProfileInfo() {
      return this.withSessionHandling(() => api.grab('/profile', this.config));
    },
  },
});

module.exports = stamp;
