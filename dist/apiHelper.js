'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.post = exports.grab = exports.grabWithoutExtractingResult = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _isomorphicFetch = require('isomorphic-fetch');

var _isomorphicFetch2 = _interopRequireDefault(_isomorphicFetch);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var MIME_TYPE_JSON = 'application/json';
var credentials = 'same-origin'; // NOTE: This option is required in order for Fetch to send cookies
var defaultHeaders = { accept: MIME_TYPE_JSON };

var extractJsonAndAddTimestamp = function extractJsonAndAddTimestamp(res) {
  var time = Date.now();
  return res.json().then(function (json) {
    return { time: time, json: json };
  });
};

var getForwardedForHeader = function getForwardedForHeader(_ref) {
  var clientIp = _ref.clientIp;

  if (!clientIp) {
    return {};
  }
  return { 'X-FORWARDED-FOR': clientIp };
};

var getSessionHeader = function getSessionHeader(_ref2) {
  var sessionId = _ref2.sessionId;

  if (!sessionId) {
    return {};
  }
  return { 'X-SESSION': sessionId };
};

var getNoCacheHeader = function getNoCacheHeader(_ref3) {
  var noCache = _ref3.noCache;

  if (!noCache) {
    return {};
  }
  return { 'X-NO-CACHE': 'true' };
};

var getContentTypeHeader = function getContentTypeHeader() {
  return { 'Content-Type': MIME_TYPE_JSON };
};

var getQueryString = function getQueryString(options) {
  var existingQs = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

  var defaultQs = {
    appKey: options.appId,
    uuid: options.uuid
  };
  var qsObject = _extends({}, existingQs, defaultQs);
  var queryString = _qs2.default.stringify(qsObject);
  return queryString;
};

var getRequestUrlWithQueryString = function getRequestUrlWithQueryString(url, options) {
  var splitUrl = url.split('?');
  var urlWithoutQs = splitUrl[0];
  var existingQs = _qs2.default.parse(splitUrl[1]);
  var queryString = getQueryString(options, existingQs);
  return urlWithoutQs + '?' + queryString;
};

var getExtraHeaders = function getExtraHeaders(options) {
  return _extends({}, getForwardedForHeader(options), getSessionHeader(options), getNoCacheHeader(options));
};

var grabWithoutExtractingResult = exports.grabWithoutExtractingResult = function grabWithoutExtractingResult(url, options) {
  var headers = _extends({}, defaultHeaders, getExtraHeaders(options));
  var requestUrl = getRequestUrlWithQueryString(url, options);
  options.debugLogger('Sending a GET request to: ' + requestUrl + '. With the following headers: ', headers);
  return (0, _isomorphicFetch2.default)(requestUrl, { credentials: credentials, headers: headers });
};

var grab = exports.grab = function grab() {
  return grabWithoutExtractingResult.apply(undefined, arguments).then(extractJsonAndAddTimestamp);
};

var post = exports.post = function post(url, options) {
  var body = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

  var headers = _extends({}, defaultHeaders, getContentTypeHeader(), getExtraHeaders(options));
  var requestUrl = getRequestUrlWithQueryString(url, options);
  options.debugLogger('Sending a POST request to: ' + requestUrl + '. With the following headers: ', headers);
  var requestOptions = {
    headers: headers,
    credentials: credentials,
    method: 'post',
    body: JSON.stringify(body)
  };
  return (0, _isomorphicFetch2.default)(requestUrl, requestOptions);
};