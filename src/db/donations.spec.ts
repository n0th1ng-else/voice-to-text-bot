import {
  describe,
  beforeEach,
  afterEach,
  expect,
  it,
  jest,
} from "@jest/globals";
import { Pool as MockPool } from "./__mocks__/pg";
import { DonationsClient } from "./donations";
import { DonationsSql } from "./sql/donations.sql";
import { DonationStatus } from "./sql/donations";

jest.mock("../logger");

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};

let testPool = new MockPool(dbConfig);
let client = new DonationsClient(testPool);

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

describe("Donations DB", () => {
  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new DonationsClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not create row", (done) => {
      client.createRow("test-usage-id", 3).then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe(
            "The table donations is not initialized yet"
          );
          runDone(done);
        }
      );
    });

    it("can not update row", (done) => {
      client.updateRow(23, false).then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe(
            "The table donations is not initialized yet"
          );
          runDone(done);
        }
      );
    });

    it("can not iterate rows", (done) => {
      client.getPendingRows().then(
        () => runFail(done),
        (err) => {
          expect(err.message).toBe(
            "The table donations is not initialized yet"
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
          () => client.createRow("test-id", 5)
        )
        .then(
          () => runFail(done),
          (err) => {
            expect(err.message).toBe(
              "The table donations is not initialized yet"
            );
            runDone(done);
          }
        );
    });
  });

  describe("initialized", () => {
    beforeEach(() => {
      testPool.mockQuery(DonationsSql.createTable, () => Promise.resolve());
      return client.init();
    });

    it("creates a new row", () => {
      const usageId = "usage-id-s";
      const price = 10;

      testPool.mockQuery(DonationsSql.insertRow, (values) => {
        expect(values).toHaveLength(5);
        const [rUsageId, rStatus, rPrice, rCreated, rUpdated] = values;

        expect(rUsageId).toBe(usageId);
        expect(rStatus).toBe(DonationStatus.Pending);
        expect(rPrice).toBe(price);
        expect(rCreated).toBe(rUpdated);

        return Promise.resolve({
          rows: [
            {
              donation_id: 21,
              status: DonationStatus.Pending,
              usage_id: rUsageId,
              price: rPrice,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        });
      });

      return client.createRow(usageId, price).then((row) => {
        expect(typeof row.donation_id).toBe("number");
        expect(row.usage_id).toBe(usageId);
        expect(row.price).toBe(price);
      });
    });

    it("updates some row NO", () => {
      const donationId = 342;
      const status = DonationStatus.Canceled;

      testPool.mockQuery(DonationsSql.updateRow, (values) => {
        expect(values).toHaveLength(3);
        const [rStatus, rUpdatedAt, rDonationId] = values;

        expect(rStatus).toBe(status);
        expect(rDonationId).toBe(donationId);
        expect(rUpdatedAt).toBeDefined();

        return Promise.resolve({
          rows: [
            {
              donation_id: rDonationId,
              status: rStatus,
              usage_id: "usidd",
              price: 4,
              created_at: new Date(),
              updated_at: rUpdatedAt,
            },
          ],
        });
      });

      return client.updateRow(donationId, false).then((row) => {
        expect(row.donation_id).toBe(donationId);
        expect(row.usage_id).toBe("usidd");
        expect(row.price).toBe(4);
        expect(row.status).toBe(status);
      });
    });

    it("updates some row OK", () => {
      const donationId = 342;
      const status = DonationStatus.Received;

      testPool.mockQuery(DonationsSql.updateRow, (values) => {
        expect(values).toHaveLength(3);
        const [rStatus, rUpdatedAt, rDonationId] = values;

        expect(rStatus).toBe(status);
        expect(rDonationId).toBe(donationId);
        expect(rUpdatedAt).toBeDefined();

        return Promise.resolve({
          rows: [
            {
              donation_id: rDonationId,
              status: rStatus,
              usage_id: "usidd",
              price: 4,
              created_at: new Date(),
              updated_at: rUpdatedAt,
            },
          ],
        });
      });

      return client.updateRow(donationId, true).then((row) => {
        expect(row.donation_id).toBe(donationId);
        expect(row.usage_id).toBe("usidd");
        expect(row.price).toBe(4);
        expect(row.status).toBe(status);
      });
    });
  });
});
