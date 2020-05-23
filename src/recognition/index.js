const { AWSProvider } = require("./aws");
const { GoogleProvider } = require("./google");

class VoiceConverter {
  constructor(provider, environmentVars) {
    switch (provider) {
      case VoiceConverterProvider.Google:
        this.provider = new GoogleProvider(environmentVars);
        return;
      case VoiceConverterProvider.Aws:
        this.provider = new AWSProvider(environmentVars);
        return;
      default:
        throw new Error("Voice recognition provider is not specified");
    }
  }

  transformToText(fileLink, data) {
    return this.provider.transformToText(fileLink, data);
  }
}

function getVoiceConverterProvider(environmentVars) {
  switch (environmentVars.PROVIDER) {
    case VoiceConverterProvider.Aws:
      return VoiceConverterProvider.Aws;
    case VoiceConverterProvider.Google:
    default:
      return VoiceConverterProvider.Google;
  }
}

const VoiceConverterProvider = {
  Google: "GOOGLE",
  Aws: "AWS",
};

module.exports = {
  getVoiceConverterProvider,
  VoiceConverter,
};
