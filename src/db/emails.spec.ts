import {
  describe,
  beforeEach,
  afterEach,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Pool as MockPool } from "./__mocks__/pg";
import { UsedEmailClient } from "./emails";
import { UsedEmailsSql } from "./sql/emails.sql";

jest.mock("../logger");

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};

let testPool = new MockPool(dbConfig);
let client = new UsedEmailClient(testPool);

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

describe("Used Emails DB", () => {
  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new UsedEmailClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not create row", (done) => {
      client.createRow("test-email").then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe(
            "The table usedemails is not initialized yet"
          );
          runDone(done);
        }
      );
    });

    it("can not update row", (done) => {
      client.updateRow(12).then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe(
            "The table usedemails is not initialized yet"
          );
          runDone(done);
        }
      );
    });

    it("can not iterate rows", (done) => {
      client.getRows("test-email-2").then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe(
            "The table usedemails is not initialized yet"
          );
          runDone(done);
        }
      );
    });

    it("init error makes api unavailable", (done) => {
      client
        .init()
        .then(
          () => runFail(done),
          () => client.createRow("test-email-3")
        )
        .then(
          () => runFail(done),
          (err) => {
            expect(err.message).toBe(
              "The table usedemails is not initialized yet"
            );
            runDone(done);
          }
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
