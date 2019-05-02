const qs = require('qs');

const HOST = 'https://api.one.accedo.tv';

module.exports.composePathWithQSFromParams = (path, params = {}) => {
  const {
    id,
    gid,
    typeId,
    alias,
    typeAlias,
    preview,
    at,
    offset,
    size,
    locale,
  } = params;
  const qsParams = {};
  // The id array must be turned into CSV
  if (id && Array.isArray(id)) {
    qsParams.id = id.join(',');
  }
  // The alias array must be turned into CSV
  if (alias && Array.isArray(alias)) {
    qsParams.alias = alias.join(',');
  }

  if (typeof gid === 'string') {
    qsParams.gid = gid;
  }
  if (typeId && Array.isArray(typeId)) {
    qsParams.typeId = typeId.join(',');
  }
  // preview is only useful when true
  if (preview) {
    qsParams.preview = true;
  }
  // at is either a string, or a method with toISOString (like a Date) that we use for formatting
  if (typeof at === 'string') {
    qsParams.at = at;
  } else if (at && at.toISOString) {
    qsParams.at = at.toISOString();
  }
  // Add curated and non-curated params
  const queryString = qs.stringify(
    Object.assign({}, qsParams, { typeAlias, offset, size, locale })
  );
  return `${path}?${queryString}`;
};

const getQueryString = (config, existingQs = {}) => {
  // When there is a sessionKey, these are useless
  const defaultQs = config.sessionKey
    ? {}
    : {
        appKey: config.appKey,
        uuid: config.deviceId,
      };
  if (config.gid) {
    defaultQs.gid = config.gid;
  }

  if (config.sessionKey && config.sessionKeyInQueryString) {
    defaultQs.sessionKey = config.sessionKey;
  }

  const qsObject = Object.assign({}, existingQs, defaultQs);
  const queryString = qs.stringify(qsObject);
  return queryString;
};

module.exports.composePathWithQSFromConfig = (path, config) => {
  const { target = HOST } = config;
  const splitUrl = path.split('?');
  const pathWithoutQs = splitUrl[0];
  const existingQs = qs.parse(splitUrl[1]);
  const queryString = getQueryString(config, existingQs);
  return `${target}${pathWithoutQs}?${queryString}`;
};
