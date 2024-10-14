import {
  describe,
  beforeEach,
  afterEach,
  expect,
  it,
  jest,
  beforeAll,
} from "@jest/globals";
import { Pool as MockPool } from "./__mocks__/pg.js";
import {
  injectDependencies,
  type InjectedFn,
} from "../testUtils/dependencies.js";

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

let UsedEmailsSql: InjectedFn["UsedEmailsSql"];
let UsedEmailClient: InjectedFn["UsedEmailClient"];
let client: InstanceType<InjectedFn["UsedEmailClient"]>;
let testPool = new MockPool(dbConfig);

describe("Used Emails DB", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    UsedEmailsSql = init.UsedEmailsSql;
    UsedEmailClient = init.UsedEmailClient;
  });

  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new UsedEmailClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not create row", async () => {
      await expect(client.createRow("test-email")).rejects.toThrowError(
        "The table usedemails is not initialized yet",
      );
    });

    it("can not update row", async () => {
      await expect(client.updateRow(12)).rejects.toThrowError(
        "The table usedemails is not initialized yet",
      );
    });

    it("can not iterate rows", async () => {
      await expect(client.getRows("test-email-2")).rejects.toThrowError(
        "The table usedemails is not initialized yet",
      );
    });

    it("init error makes api unavailable", async () => {
      await expect(client.init()).rejects.toThrowError();
      await expect(client.createRow("test-email-3")).rejects.toThrowError(
        "The table usedemails is not initialized yet",
      );
    });
  });

  describe("initialized", () => {
    beforeEach(() => {
      testPool.mockQuery(UsedEmailsSql.createTable, () => Promise.resolve());
      return client.init();
    });

    it("creates a new row", () => {
      const email = "new-email-1";

      testPool.mockQuery(UsedEmailsSql.insertRow, (values) => {
        expect(values).toHaveLength(2);
        const [rEmail, rStartAt] = values;

        expect(typeof rEmail).toBe("string");
        expect(rEmail).toBe(email);
        expect(rStartAt).toBeDefined();

        return Promise.resolve({
          rows: [
            {
              email_id: 1,
              email: rEmail,
              start_at: rStartAt,
              stop_at: null,
            },
          ],
        });
      });

      return client.createRow(email).then((row) => {
        expect(typeof row.email_id).toBe("number");
        expect(row.email).toBe(email);
        expect(row.start_at).toBeDefined();
        expect(row.stop_at).toBe(null);
      });
    });

    it("updates some row", () => {
      const emailId = 32;

      testPool.mockQuery(UsedEmailsSql.updateRow, (values) => {
        expect(values).toHaveLength(2);
        const [rStopAt, rEmailId] = values;

        expect(rEmailId).toBe(emailId);
        expect(rStopAt).toBeDefined();

        return Promise.resolve({
          rows: [
            {
              email_id: rEmailId,
              email: "some-email-44",
              start_at: new Date(),
              stop_at: rStopAt,
            },
          ],
        });
      });

      return client.updateRow(emailId).then((row) => {
        expect(row.email_id).toBe(emailId);
        expect(row.email).toBe("some-email-44");
        expect(row.start_at).toBeDefined();
        expect(row.stop_at).toBeDefined();
      });
    });
  });
});
