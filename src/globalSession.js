let globalSessionPromise = null;

module.exports.setGlobalSession = value => {
  globalSessionPromise = value;
};

module.exports.getGlobalSession = () => globalSessionPromise;
