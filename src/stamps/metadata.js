const sessionStamp = require('./session');
const { grab } = require('../apiHelper');
const { composePathWithQSFromParams } = require('../urlComposer');

function request(path, params) {
  const pathWithQs = composePathWithQSFromParams(path, params);
  return this.withSessionHandling(() => grab(pathWithQs, this.config));
}

// Make sure we have the sessionStamp withSessionHandling method
const stamp = sessionStamp.compose({
  methods: {
    /**
     * Get all the metadata
     * @param {object} [params] a parameters object
     * @param {string} [params.gid] used for whitelisting
     * @return {promise}  a promise of the requested data
     */
    getAllMetadata(params) {
      return request.call(this, '/metadata', params);
    },

    /**
     * Get the metadata by a specific key
     * @param {string} key a key to get specific metadata
     * @param {object} [params] a parameters object
     * @param {string} [params.gid] used for whitelisting
     * @return {promise}  a promise of the requested data
     */
    getMetadataByKey(key, params) {
      return request.call(this, `/metadata/${key}`, params);
    },

    /**
     * Get the metadata by specific keys
     * @param {array} keys an array of keys (strings)
     * @param {object} [params] a parameters object
     * @param {string} [params.gid] used for whitelisting
     * @return {promise}  a promise of the requested data
     */
    getMetadataByKeys(keys, params) {
      return request.call(this, `/metadata/${keys.join(',')}`, params);
    },
  },
});

module.exports = stamp;
