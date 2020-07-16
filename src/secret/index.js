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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function setSecretValue(environmentVars, secret) {
  return getService(environmentVars).addSecretVersion({
    parent: "projects/845739657426/secrets/telegram-token",
    payload: {
      data: Buffer.from(secret, "utf8"),
    },
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getSecretVersion(environmentVars, secretName) {
  return getService(environmentVars)
    .accessSecretVersion({
      name: "projects/845739657426/secrets/telegram-token/versions/1",
    })
    .then(([data]) => data.payload.data.toString("utf8"));
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleTelegramToken(environmentVars, secretName, token) {
  return (
    getSecretVersion(environmentVars)
      // setTelegramToken(environmentVars, secretName, token)
      // .then(() => getTelegramToken(environmentVars, secretName))
      .then((data) => {
        // eslint-disable-next-line no-console
        console.log(data);
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error("!!!", err);
      })
  );
}

module.exports = {
  handleTelegramToken,
};
