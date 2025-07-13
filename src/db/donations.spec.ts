import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type pg from "pg";
import { Pool as MockPool } from "./__mocks__/pg.js";
import {
  asChatId__test,
  asDonationId__test,
  asPaymentChargeId__test,
} from "../testUtils/types.js";
import { DonationsClient } from "./donations.js";
import type { DonationRowScheme, DonationStatus } from "./sql/donations.js";
import { DonationsSql } from "./sql/donations.sql.js";
import type { Currency } from "../telegram/api/groups/payments/payments-types.js";

vi.mock("../logger/index");

const dbConfig: pg.PoolConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};

let testPool = new MockPool(dbConfig);
let client: DonationsClient;

describe("Donations DB", () => {
  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new DonationsClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not create row", async () => {
      await expect(
        client.createRow(asChatId__test(23444), 3, "EUR"),
      ).rejects.toThrowError("The table donations is not initialized yet");
    });

    it("can not update row", async () => {
      const status: DonationStatus = "PENDING";
      await expect(
        client.updateRow(asDonationId__test(23), status),
      ).rejects.toThrowError("The table donations is not initialized yet");
    });

    it("can not iterate rows", async () => {
      await expect(client.getPendingRows()).rejects.toThrowError(
        "The table donations is not initialized yet",
      );
    });

    it("init error makes api unavailable", async () => {
      await expect(client.init()).rejects.toThrowError();
      await expect(
        client.createRow(asChatId__test(5231), 5, "EUR"),
      ).rejects.toThrowError("The table donations is not initialized yet");
    });
  });

  describe("initialized", () => {
    beforeEach(() => {
      testPool.mockQuery(DonationsSql.createTable, () => Promise.resolve());
      testPool.mockQuery(DonationsSql.migration_22032025_1, () =>
        Promise.resolve(),
      );
      testPool.mockQuery(DonationsSql.migration_22032025_2, () =>
        Promise.resolve(),
      );
      return client.init();
    });

    it("creates a new row", () => {
      const chatId = asChatId__test(83222);
      const price = 10;
      const currency: Currency = "EUR";
      const status: DonationStatus = "INITIALIZED";

      testPool.mockQuery(DonationsSql.insertRow, (values) => {
        expect(values).toHaveLength(6);
        const [rChatId, rStatus, rPrice, rCurrency, rCreated, rUpdated] =
          values;

        expect(rChatId).toBe(chatId);
        expect(rStatus).toBe(status);
        expect(rPrice).toBe(price);
        expect(rCreated).toBe(rUpdated);
        expect(rCurrency).toBe(currency);

        return Promise.resolve<{ rows: DonationRowScheme[] }>({
          rows: [
            {
              donation_id: asDonationId__test(21),
              status: rStatus,
              chat_id: rChatId,
              price: rPrice,
              currency: rCurrency,
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        });
      });

      return client.createRow(chatId, price, currency).then((row) => {
        expect(typeof row.donation_id).toBe("number");
        expect(row.chat_id).toBe(chatId);
        expect(row.price).toBe(price);
        expect(row.currency).toBe(currency);
        expect(row.status).toBe(status);
      });
    });

    it("updates some row as Canceled", () => {
      const donationId = asDonationId__test(342);
      const status: DonationStatus = "CANCELED";

      testPool.mockQuery(DonationsSql.updateRow, (values) => {
        expect(values).toHaveLength(4);
        const [rStatus, rPaymentChargeId, rUpdatedAt, rDonationId] = values;

        expect(rStatus).toBe(status);
        expect(rDonationId).toBe(donationId);
        expect(rUpdatedAt).toBeDefined();

        return Promise.resolve<{ rows: DonationRowScheme[] }>({
          rows: [
            {
              donation_id: rDonationId,
              status: rStatus,
              charge_id: rPaymentChargeId,
              chat_id: asChatId__test(34444),
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
      const donationId = asDonationId__test(342);
      const status: DonationStatus = "RECEIVED";

      testPool.mockQuery(DonationsSql.updateRow, (values) => {
        expect(values).toHaveLength(4);
        const [rStatus, rPaymentChargeId, rUpdatedAt, rDonationId] = values;

        expect(rStatus).toBe(status);
        expect(rDonationId).toBe(donationId);
        expect(rUpdatedAt).toBeDefined();
        expect(rPaymentChargeId).toBe(undefined);

        return Promise.resolve<{ rows: DonationRowScheme[] }>({
          rows: [
            {
              donation_id: rDonationId,
              status: rStatus,
              chat_id: asChatId__test(21344),
              charge_id: rPaymentChargeId,
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
      const donationId = asDonationId__test(342);
      const status: DonationStatus = "PENDING";

      testPool.mockQuery(DonationsSql.updateRow, (values) => {
        expect(values).toHaveLength(4);
        const [rStatus, rPaymentChargeId, rUpdatedAt, rDonationId] = values;

        expect(rStatus).toBe(status);
        expect(rDonationId).toBe(donationId);
        expect(rUpdatedAt).toBeDefined();
        expect(rPaymentChargeId).toBe(undefined);

        return Promise.resolve<{ rows: DonationRowScheme[] }>({
          rows: [
            {
              donation_id: rDonationId,
              status: rStatus,
              charge_id: rPaymentChargeId,
              chat_id: asChatId__test(21344),
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

    it("updates some row with chargeId", () => {
      const donationId = asDonationId__test(342);
      const status: DonationStatus = "PENDING";
      const chargeId = asPaymentChargeId__test("asdadassda");

      testPool.mockQuery(DonationsSql.updateRow, (values) => {
        expect(values).toHaveLength(4);
        const [rStatus, rPaymentChargeId, rUpdatedAt, rDonationId] = values;

        expect(rStatus).toBe(status);
        expect(rDonationId).toBe(donationId);
        expect(rUpdatedAt).toBeDefined();
        expect(rPaymentChargeId).toBe(chargeId);

        return Promise.resolve<{ rows: DonationRowScheme[] }>({
          rows: [
            {
              donation_id: rDonationId,
              status: rStatus,
              charge_id: rPaymentChargeId,
              chat_id: asChatId__test(21344),
              price: 4,
              created_at: new Date(),
              updated_at: rUpdatedAt,
            },
          ],
        });
      });

      return client.updateRow(donationId, status, chargeId).then((row) => {
        expect(row.donation_id).toBe(donationId);
        expect(row.chat_id).toBe(21344);
        expect(row.charge_id).toBe(chargeId);
        expect(row.price).toBe(4);
        expect(row.status).toBe(status);
      });
    });
  });
});
