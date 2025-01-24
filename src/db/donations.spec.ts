import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { Pool as MockPool } from "./__mocks__/pg.js";
import {
  injectDependencies,
  type InjectedFn,
} from "../testUtils/dependencies.js";

vi.mock("../logger/index");

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};

let DonationsSql: InjectedFn["DonationsSql"];
let DonationsClient: InjectedFn["DonationsClient"];
let DonationStatus: InjectedFn["DonationStatus"];
let testPool = new MockPool(dbConfig);
let client: InstanceType<InjectedFn["DonationsClient"]>;

describe("Donations DB", () => {
  beforeAll(async () => {
    const init = await injectDependencies();
    DonationsSql = init.DonationsSql;
    DonationsClient = init.DonationsClient;
    DonationStatus = init.DonationStatus;
  });

  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new DonationsClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not create row", async () => {
      await expect(client.createRow(23444, 3)).rejects.toThrowError(
        "The table donations is not initialized yet",
      );
    });

    it("can not update row", async () => {
      await expect(
        client.updateRow(23, DonationStatus.Pending),
      ).rejects.toThrowError("The table donations is not initialized yet");
    });

    it("can not iterate rows", async () => {
      await expect(client.getPendingRows()).rejects.toThrowError(
        "The table donations is not initialized yet",
      );
    });

    it("init error makes api unavailable", async () => {
      await expect(client.init()).rejects.toThrowError();
      await expect(client.createRow(5231, 5)).rejects.toThrowError(
        "The table donations is not initialized yet",
      );
    });
  });

  describe("initialized", () => {
    beforeEach(() => {
      testPool.mockQuery(DonationsSql.createTable, () => Promise.resolve());
      return client.init();
    });

    it("creates a new row", () => {
      const chatId = 83222;
      const price = 10;
      const status = DonationStatus.Initialized;

      testPool.mockQuery(DonationsSql.insertRow, (values) => {
        expect(values).toHaveLength(5);
        const [rChatId, rStatus, rPrice, rCreated, rUpdated] = values;

        expect(rChatId).toBe(chatId);
        expect(rStatus).toBe(status);
        expect(rPrice).toBe(price);
        expect(rCreated).toBe(rUpdated);

        return Promise.resolve({
          rows: [
            {
              donation_id: 21,
              status: rStatus,
              chat_id: rChatId,
              price: rPrice,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        });
      });

      return client.createRow(chatId, price).then((row) => {
        expect(typeof row.donation_id).toBe("number");
        expect(row.chat_id).toBe(chatId);
        expect(row.price).toBe(price);
        expect(row.status).toBe(status);
      });
    });

    it("updates some row as Canceled", () => {
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
              chat_id: 34444,
              price: 4,
              created_at: new Date(),
              updated_at: rUpdatedAt,
            },
          ],
        });
      });

      return client.updateRow(donationId, status).then((row) => {
        expect(row.donation_id).toBe(donationId);
        expect(row.chat_id).toBe(34444);
        expect(row.price).toBe(4);
        expect(row.status).toBe(status);
      });
    });

    it("updates some row as Received", () => {
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
              chat_id: 21344,
              price: 4,
              created_at: new Date(),
              updated_at: rUpdatedAt,
            },
          ],
        });
      });

      return client.updateRow(donationId, status).then((row) => {
        expect(row.donation_id).toBe(donationId);
        expect(row.chat_id).toBe(21344);
        expect(row.price).toBe(4);
        expect(row.status).toBe(status);
      });
    });

    it("updates some row as Pending", () => {
      const donationId = 342;
      const status = DonationStatus.Pending;

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
              chat_id: 21344,
              price: 4,
              created_at: new Date(),
              updated_at: rUpdatedAt,
            },
          ],
        });
      });

      return client.updateRow(donationId, status).then((row) => {
        expect(row.donation_id).toBe(donationId);
        expect(row.chat_id).toBe(21344);
        expect(row.price).toBe(4);
        expect(row.status).toBe(status);
      });
    });
  });
});
