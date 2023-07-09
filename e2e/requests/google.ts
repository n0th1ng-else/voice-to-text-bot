import nock from "nock";

export const mockGoogleAuth = (): nock.Scope => {
  const scope = nock("https://www.googleapis.com");
  scope.post("/oauth2/v4/token").reply(
    200,
    {
      access_token: "new-test-token that was received from the auth server",
      expires_in: 100000,
      token_type: "Bearer",
    },
    { "Content-Type": "application/json" },
  );
  return scope;
};

export const mockSpeechRecognition = (text: string): nock.Scope => {
  // TODO replace with real test data. This protobuf === gzipped 'supergroup'
  const response = text
    ? [
        "1f",
        "8b",
        "08",
        "00",
        "00",
        "00",
        "00",
        "00",
        "02",
        "ff",
        "13",
        "12",
        "e612e4e22a2e2d482d4a2fca2f2d10bd55eb650f00e0c1715e15000000",
      ]
    : [];
  const scope = nock("https://speech.googleapis.com");
  scope
    .post("/$rpc/google.cloud.speech.v1.Speech/Recognize")
    .reply(200, response, {
      "Content-Type": "application/x-protobuf",
      "Content-Encoding": "gzip",
    });
  return scope;
};
