import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { Pool as MockPool } from "./__mocks__/pg";
import { UsagesClient } from "./usages";
import { LanguageCode } from "../recognition/types";
import { UsagesSql } from "./sql/usages.sql";

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};

let testPool = new MockPool(dbConfig);
let client = new UsagesClient(testPool);

const runFail = (doneFn, reason = "should not be there"): void => {
  if (!doneFn) {
    throw new Error("done is not defined");
  }
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  doneFn.fail(reason);
};

const runDone = (doneFn) => {
  if (!doneFn) {
    throw new Error("done is not defined");
  }
  doneFn();
};

describe("Usages DB", () => {
  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new UsagesClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not import row", (done) => {
      client
        .importRow(1234, 3, LanguageCode.En, "t-user", new Date(), new Date())
        .then(
          () => runFail(done),
          (err) => {
            expect(err.message).toBe("The table usages is not initialized yet");
            runDone(done);
          }
        );
    });

    it("can not update language", (done) => {
      client.updateLangId(45611, LanguageCode.Ru).then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe("The table usages is not initialized yet");
          runDone(done);
        }
      );
    });

    it("can not get the language", (done) => {
      client.getLangId(-123123, "test-user", LanguageCode.En).then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe("The table usages is not initialized yet");
          runDone(done);
        }
      );
    });

    it("can not update usage count", (done) => {
      client.updateUsageCount(-72722, "new-name", LanguageCode.Ru).then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe("The table usages is not initialized yet");
          runDone(done);
        }
      );
    });

    it("init error makes api unavailable", (done) => {
      client
        .init()
        .then(
          () => runFail(done),
          () => client.getLangId(-123123, "test-user", LanguageCode.En)
        )
        .then(
          () => runFail(done),
          (err) => {
            expect(err.message).toBe("The table usages is not initialized yet");
            runDone(done);
          }
        );
    });
  });

  describe("initialized", () => {
    beforeEach(() => {
      testPool.mockQuery(UsagesSql.createTable, () => Promise.resolve());
      return client.init();
    });

    describe("creates a new row", () => {
      it("during the update language", () => {
        const chatId = 124522;
        const langId = LanguageCode.Ru;

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] })
        );
        testPool.mockQuery(UsagesSql.insertRow, (values) => {
          expect(values).toHaveLength(7);
          const [
            rUsageId,
            rChatId,
            rUser,
            rUsageCount,
            rLangId,
            rCreated,
            rUpdated,
          ] = values;

          expect(typeof rUsageId).toBe("string");
          expect(rChatId).toBe(chatId);
          expect(rUser).toBe("");
          expect(rUsageCount).toBe(0);
          expect(rLangId).toBe(langId);
          expect(rCreated).toBe(rUpdated);

          return Promise.resolve({
            rows: [
              {
                usage_id: rUsageId,
                chat_id: rChatId,
                user_name: rUser,
                usage_count: rUsageCount,
                lang_id: rLangId,
                created_at: rCreated,
                updated_at: rUpdated,
              },
            ],
          });
        });

        return client.updateLangId(chatId, langId).then((row) => {
          expect(typeof row.usage_id).toBe("string");
          expect(row.chat_id).toBe(chatId);
          expect(row.user_name).toBe("");
          expect(row.usage_count).toBe(0);
        });
      });

      it("during the get language", () => {
        const chatId = 124522;
        const langId = LanguageCode.En;
        const userName = "some-super-user";

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] })
        );
        testPool.mockQuery(UsagesSql.insertRow, (values) => {
          expect(values).toHaveLength(7);
          const [
            rUsageId,
            rChatId,
            rUser,
            rUsageCount,
            rLangId,
            rCreated,
            rUpdated,
          ] = values;

          expect(typeof rUsageId).toBe("string");
          expect(rChatId).toBe(chatId);
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(0);
          expect(rLangId).toBe(langId);
          expect(rCreated).toBe(rUpdated);

          return Promise.resolve({
            rows: [
              {
                usage_id: rUsageId,
                chat_id: rChatId,
                user_name: rUser,
                usage_count: rUsageCount,
                lang_id: rLangId,
                created_at: rCreated,
                updated_at: rUpdated,
              },
            ],
          });
        });

        return client.getLangId(chatId, userName, langId).then((language) => {
          expect(language).toBe(langId);
        });
      });

      it("during the update usage count", () => {
        const chatId = 124522;
        const langId = LanguageCode.En;
        const userName = "some-super-user";

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] })
        );
        testPool.mockQuery(UsagesSql.insertRow, (values) => {
          expect(values).toHaveLength(7);
          const [
            rUsageId,
            rChatId,
            rUser,
            rUsageCount,
            rLangId,
            rCreated,
            rUpdated,
          ] = values;

          expect(typeof rUsageId).toBe("string");
          expect(rChatId).toBe(chatId);
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(1);
          expect(rLangId).toBe(langId);
          expect(rCreated).toBe(rUpdated);

          return Promise.resolve({
            rows: [
              {
                usage_id: rUsageId,
                chat_id: rChatId,
                user_name: rUser,
                usage_count: rUsageCount,
                lang_id: rLangId,
                created_at: rCreated,
                updated_at: rUpdated,
              },
            ],
          });
        });

        return client.updateUsageCount(chatId, userName, langId).then((row) => {
          expect(typeof row.usage_id).toBe("string");
          expect(row.chat_id).toBe(chatId);
          expect(row.user_name).toBe(userName);
          expect(row.usage_count).toBe(1);
        });
      });

      it("during the row import", () => {
        const chatId = 25552342;
        const usageCount = 2114;
        const langId = LanguageCode.Ru;
        const userName = "alfa dude";
        const createdAt = new Date("2019-11-11");
        const updatedAt = new Date();

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] })
        );
        testPool.mockQuery(UsagesSql.insertRow, (values) => {
          expect(values).toHaveLength(7);
          const [
            rUsageId,
            rChatId,
            rUser,
            rUsageCount,
            rLangId,
            rCreated,
            rUpdated,
          ] = values;

          expect(typeof rUsageId).toBe("string");
          expect(rChatId).toBe(chatId);
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(usageCount);
          expect(rLangId).toBe(langId);
          expect(rCreated).toBe(rUpdated);

          return Promise.resolve({
            rows: [
              {
                usage_id: rUsageId,
                chat_id: rChatId,
                user_name: rUser,
                usage_count: rUsageCount,
                lang_id: rLangId,
                created_at: rCreated,
                updated_at: rUpdated,
              },
            ],
          });
        });

        testPool.mockQuery(UsagesSql.updateRowWithDate, (values) => {
          expect(values).toHaveLength(6);
          const [
            rUser,
            rUsageCount,
            rLangId,
            rCreated,
            rUpdated,
            rUsageId,
          ] = values;

          expect(typeof rUsageId).toBe("string");
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(usageCount);
          expect(rLangId).toBe(langId);
          expect(rCreated).toBe(createdAt);
          expect(rUpdated).toBe(updatedAt);

          return Promise.resolve({
            rows: [
              {
                usage_id: rUsageId,
                chat_id: chatId,
                user_name: rUser,
                usage_count: rUsageCount,
                lang_id: rLangId,
                created_at: rCreated,
                updated_at: rUpdated,
              },
            ],
          });
        });

        return client
          .importRow(chatId, usageCount, langId, userName, createdAt, updatedAt)
          .then((row) => {
            expect(typeof row.usage_id).toBe("string");
            expect(row.chat_id).toBe(chatId);
            expect(row.user_name).toBe(userName);
            expect(row.usage_count).toBe(usageCount);
          });
      });
    });

    describe("updates existing row", () => {
      it("during the update language", () => {
        const usageId = "new-id";
        const chatId = 124522;
        const userName = "John Wo";
        const usageCount = 231;
        const langId = LanguageCode.En;
        const prevLangId = LanguageCode.Ru;

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({
            rows: [
              {
                usage_id: usageId,
                chat_id: chatId,
                user_name: userName,
                usage_count: usageCount,
                lang_id: prevLangId,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          })
        );
        testPool.mockQuery(UsagesSql.updateRow, (values) => {
          expect(values).toHaveLength(5);
          const [rUser, rUsageCount, rLangId, rUpdated, rUsageId] = values;

          expect(rUsageId).toBe(usageId);
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(usageCount);
          expect(rLangId).toBe(langId);

          return Promise.resolve({
            rows: [
              {
                usage_id: rUsageId,
                chat_id: chatId,
                user_name: rUser,
                usage_count: rUsageCount,
                lang_id: rLangId,
                updated_at: rUpdated,
              },
            ],
          });
        });

        return client.updateLangId(chatId, langId).then((row) => {
          expect(row.usage_id).toBe(usageId);
          expect(row.chat_id).toBe(chatId);
          expect(row.user_name).toBe(userName);
          expect(row.usage_count).toBe(usageCount);
        });
      });

      it("during the get language (weird one)", () => {
        const usageId = "new-id-2";
        const chatId = -213555;
        const userName = "Spring Field";
        const usageCount = 111;
        const langId = LanguageCode.En;

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({
            rows: [
              {
                usage_id: usageId,
                chat_id: chatId,
                user_name: userName,
                usage_count: usageCount,
                lang_id: "it-IT",
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          })
        );

        return client.getLangId(chatId, userName, langId).then((language) => {
          expect(language).toBe(langId);
        });
      });

      it("during the get language", () => {
        const usageId = "new-id-2";
        const chatId = -213555;
        const userName = "Spring Field";
        const usageCount = 111;
        const langId = LanguageCode.En;

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({
            rows: [
              {
                usage_id: usageId,
                chat_id: chatId,
                user_name: userName,
                usage_count: usageCount,
                lang_id: langId,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          })
        );

        return client.getLangId(chatId, userName, langId).then((language) => {
          expect(language).toBe(langId);
        });
      });

      it("during the update usage count", () => {
        const usageId = "asdgfddf";
        const chatId = 12552233;
        const userName = "superdave";
        const usageCount = 56112;
        const langId = LanguageCode.Ru;

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({
            rows: [
              {
                usage_id: usageId,
                chat_id: chatId,
                user_name: "asdadtgg",
                usage_count: usageCount,
                lang_id: langId,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          })
        );
        testPool.mockQuery(UsagesSql.updateRow, (values) => {
          expect(values).toHaveLength(5);
          const [rUser, rUsageCount, rLangId, rUpdated, rUsageId] = values;

          expect(rUsageId).toBe(usageId);
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(usageCount + 1);
          expect(rLangId).toBe(langId);

          return Promise.resolve({
            rows: [
              {
                usage_id: rUsageId,
                chat_id: chatId,
                user_name: rUser,
                usage_count: rUsageCount,
                lang_id: rLangId,
                updated_at: rUpdated,
              },
            ],
          });
        });

        return client
          .updateUsageCount(chatId, userName, LanguageCode.En)
          .then((row) => {
            expect(row.usage_id).toBe(usageId);
            expect(row.chat_id).toBe(chatId);
            expect(row.user_name).toBe(userName);
            expect(row.lang_id).toBe(langId);
            expect(row.usage_count).toBe(usageCount + 1);
          });
      });

      it("during the row import", () => {
        const usageId = "asdgfdf=asdsada";
        const chatId = 25552342;
        const usageCount = 2114;
        const langId = LanguageCode.Ru;
        const userName = "alfa dude";
        const createdAt = new Date("2019-11-11");
        const updatedAt = new Date();

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({
            rows: [
              {
                usage_id: usageId,
                chat_id: chatId,
                user_name: "aaaaaa-bbbb",
                usage_count: 1,
                lang_id: "sv-SV",
                created_at: new Date("2010-01-01"),
                updated_at: new Date("2012-10-12"),
              },
            ],
          })
        );

        testPool.mockQuery(UsagesSql.updateRowWithDate, (values) => {
          expect(values).toHaveLength(6);
          const [
            rUser,
            rUsageCount,
            rLangId,
            rCreated,
            rUpdated,
            rUsageId,
          ] = values;

          expect(typeof rUsageId).toBe("string");
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(usageCount);
          expect(rLangId).toBe(langId);
          expect(rCreated).toBe(createdAt);
          expect(rUpdated).toBe(updatedAt);

          return Promise.resolve({
            rows: [
              {
                usage_id: rUsageId,
                chat_id: chatId,
                user_name: rUser,
                usage_count: rUsageCount,
                lang_id: rLangId,
                created_at: rCreated,
                updated_at: rUpdated,
              },
            ],
          });
        });

        return client
          .importRow(chatId, usageCount, langId, userName, createdAt, updatedAt)
          .then((row) => {
            expect(row.usage_id).toBe(usageId);
            expect(row.chat_id).toBe(chatId);
            expect(row.user_name).toBe(userName);
            expect(row.usage_count).toBe(usageCount);
          });
      });
    });

    describe("unable to receive the result row", () => {
      it("on create row", (done) => {
        const chatId = 124522;
        const langId = LanguageCode.En;
        const userName = "some-super-user";

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] })
        );
        testPool.mockQuery(UsagesSql.insertRow, (values) => {
          expect(values).toHaveLength(7);
          const [
            rUsageId,
            rChatId,
            rUser,
            rUsageCount,
            rLangId,
            rCreated,
            rUpdated,
          ] = values;

          expect(typeof rUsageId).toBe("string");
          expect(rChatId).toBe(chatId);
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(0);
          expect(rLangId).toBe(langId);
          expect(rCreated).toBe(rUpdated);

          return Promise.resolve({
            rows: [],
          });
        });

        client.getLangId(chatId, userName, langId).then(
          () => runFail(done),
          (err) => {
            expect(err.message).toBe("Unable to get created row info");
            runDone(done);
          }
        );
      });

      it("on update row", (done) => {
        const usageId = "asdgfddf";
        const chatId = 12552233;
        const userName = "superdave";
        const usageCount = 56112;
        const langId = LanguageCode.Ru;

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({
            rows: [
              {
                usage_id: usageId,
                chat_id: chatId,
                user_name: "asdadtgg",
                usage_count: usageCount,
                lang_id: langId,
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          })
        );
        testPool.mockQuery(UsagesSql.updateRow, (values) => {
          expect(values).toHaveLength(5);
          const [rUser, rUsageCount, rLangId, rUpdated, rUsageId] = values;

          expect(rUsageId).toBe(usageId);
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(usageCount + 1);
          expect(rLangId).toBe(langId);

          return Promise.resolve({
            rows: [],
          });
        });

        client.updateUsageCount(chatId, userName, LanguageCode.En).then(
          () => runFail(done),
          (err) => {
            expect(err.message).toBe("Unable to get updated row info");
            runDone(done);
          }
        );
      });
    });
  });
});
