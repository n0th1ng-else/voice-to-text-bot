class GoogleProvider {
  constructor(environmentVars) {
    this.token = environmentVars.GOOGLE_API;
  }

  transformToText(fileLink, data) {
    return Promise.reject(new Error("Not implemented"));
  }
}

module.exports = {
  GoogleProvider,
};
