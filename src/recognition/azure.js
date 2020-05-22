class AzureProvider {
  constructor(environmentVars) {
    writeOutput("Using Azure");

    this.token = environmentVars.AZURE_API;
  }

  transformToText(fileLink, data) {
    return Promise.reject(new Error("Not implemented"));
  }
}

module.exports = {
  AzureProvider,
};
