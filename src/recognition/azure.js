class AzureProvider {
  constructor(environmentVars) {
    this.token = environmentVars.AZURE_API;
  }

  transformToText(fileLink, data) {
    return Promise.reject(new Error("Not implemented"));
  }
}

module.exports = {
  AzureProvider,
};
