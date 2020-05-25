const { SecretManagerServiceClient } = require("@google-cloud/secret-manager");

function getService(environmentVars) {
  return new SecretManagerServiceClient({
    projectId: environmentVars.GOOGLE_PROJECT_ID,
    credentials: {
      private_key: environmentVars.GOOGLE_PRIVATE_KEY,
      client_email: environmentVars.GOOGLE_CLIENT_EMAIL,
    },
  });
}

function createSecret(environmentVars, secretName) {
  return getService(environmentVars).createSecret({
    parent: `projects/${environmentVars.GOOGLE_PROJECT_ID}`,
    secretId: secretName,
    secret: {
      name: secretName,
      replication: {
        automatic: {},
      },
    },
  });
}

function setSecretValue(environmentVars, secret) {
  return getService(environmentVars).addSecretVersion({
    parent: "projects/845739657426/secrets/telegram-token",
    payload: {
      data: Buffer.from(secret, "utf8"),
    },
  });
}

function getSecretVersion(environmentVars, secretName) {
  return getService(environmentVars)
    .accessSecretVersion({
      name: "projects/845739657426/secrets/telegram-token/versions/1",
    })
    .then(([data]) => data.payload.data.toString("utf8"));
}

function handleTelegramToken(environmentVars, secretName, token) {
  return (
    getSecretVersion(environmentVars)
      // setTelegramToken(environmentVars, secretName, token)
      // .then(() => getTelegramToken(environmentVars, secretName))
      .then((data) => {
        console.log(data);
      })
      .catch((err) => console.error("!!!", err))
  );
}

module.exports = {
  handleTelegramToken,
};
