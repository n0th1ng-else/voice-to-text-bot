import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Pool as MockPool } from "./__mocks__/pg.js";
import {
  injectDependencies,
  type InjectedFn,
} from "../testUtils/dependencies.js";
import type { LanguageCode } from "../recognition/types.js";

jest.unstable_mockModule(
  "../logger/index",
  () => import("../logger/__mocks__/index.js"),
);

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};

let UsagesClient: InjectedFn["UsagesClient"];
let UsagesSql: InjectedFn["UsagesSql"];
let testPool = new MockPool(dbConfig);
let client: InstanceType<InjectedFn["UsagesClient"]>;

describe("Usages DB", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    UsagesClient = init.UsagesClient;
    UsagesSql = init.UsagesSql;
  });

  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new UsagesClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not import row", async () => {
      await expect(
        client.importRow(1234, 3, "en-US", "t-user", new Date(), new Date()),
      ).rejects.toThrowError("The table usages is not initialized yet");
    });

    it("can not update language", async () => {
      await expect(client.updateLangId(45611, "ru-RU")).rejects.toThrowError(
        "The table usages is not initialized yet",
      );
    });

    it("can not get the language", async () => {
      await expect(
        client.getLangId(-123123, "test-user", "en-US"),
      ).rejects.toThrowError("The table usages is not initialized yet");
    });

    it("can not update usage count", async () => {
      await expect(
        client.updateUsageCount(-72722, "new-name", "ru-RU"),
      ).rejects.toThrowError("The table usages is not initialized yet");
    });

    it("init error makes api unavailable", async () => {
      await expect(client.init()).rejects.toThrow();
      await expect(
        client.getLangId(-123123, "test-user", "en-US"),
      ).rejects.toThrowError("The table usages is not initialized yet");
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
        const langId: LanguageCode = "ru-RU";

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] }),
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
        const langId: LanguageCode = "en-US";
        const userName = "some-super-user";

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] }),
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
        const langId: LanguageCode = "en-US";
        const userName = "some-super-user";

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] }),
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
        const langId: LanguageCode = "ru-RU";
        const userName = "alfa dude";
        const createdAt = new Date("2019-11-11");
        const updatedAt = new Date();

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] }),
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
          const [rUser, rUsageCount, rLangId, rCreated, rUpdated, rUsageId] =
            values;

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
        const langId: LanguageCode = "en-US";
        const prevLangId: LanguageCode = "ru-RU";

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
          }),
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
        const langId: LanguageCode = "en-US";

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
          }),
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
        const langId: LanguageCode = "en-US";

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
          }),
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
        const langId: LanguageCode = "ru-RU";

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
          }),
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
          .updateUsageCount(chatId, userName, "en-US")
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
        const langId: LanguageCode = "ru-RU";
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
          }),
        );

        testPool.mockQuery(UsagesSql.updateRowWithDate, (values) => {
          expect(values).toHaveLength(6);
          const [rUser, rUsageCount, rLangId, rCreated, rUpdated, rUsageId] =
            values;

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
      it("on create row", async () => {
        const chatId = 124522;
        const langId: LanguageCode = "en-US";
        const userName = "some-super-user";

        testPool.mockQuery(UsagesSql.getRows, () =>
          Promise.resolve({ rows: [] }),
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

        await expect(
          client.getLangId(chatId, userName, langId),
        ).rejects.toThrowError("Unable to get created row info");
      });

      it("on update row", async () => {
        const usageId = "asdgfddf";
        const chatId = 12552233;
        const userName = "superdave";
        const usageCount = 56112;
        const langId: LanguageCode = "ru-RU";

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
          }),
        );
        testPool.mockQuery(UsagesSql.updateRow, (values) => {
          expect(values).toHaveLength(5);
          const [rUser, rUsageCount, rLangId, , rUsageId] = values;

          expect(rUsageId).toBe(usageId);
          expect(rUser).toBe(userName);
          expect(rUsageCount).toBe(usageCount + 1);
          expect(rLangId).toBe(langId);

          return Promise.resolve({
            rows: [],
          });
        });

        await expect(
          client.updateUsageCount(chatId, userName, "en-US"),
        ).rejects.toThrowError("Unable to get updated row info");
      });
    });
  });
});
