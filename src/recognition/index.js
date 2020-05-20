const { AWSProvider } = require("./aws");
const { AzureProvider } = require("./azure");
const { GoogleProvider } = require("./google");

class VoiceConverter {
  constructor(provider, environmentVars) {
    switch (provider) {
      case VoiceConverterProvider.google:
        this.provider = new GoogleProvider(environmentVars);
        return;
      case VoiceConverterProvider.aws:
        this.provider = new AWSProvider(environmentVars);
        return;
      case VoiceConverterProvider.azure:
        this.provider = new AzureProvider(environmentVars);
        return;
      default:
        throw new Error("Voice recognition provider is not specified");
    }
  }

  transformToText(fileLink, data) {
    return this.provider.transformToText(fileLink, data);
  }
}

const VoiceConverterProvider = {
  google: "GOOGLE",
  azure: "AZURE",
  aws: "AWS",
};

module.exports = {
  VoiceConverterProvider,
  VoiceConverter,
};
