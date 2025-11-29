import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Pool as MockPool } from "./__mocks__/pg.js";
import {
  asPaymentChargeId__test,
  asSubscriptionId__test,
  asUserId__test,
} from "../testUtils/types.js";
import { SubscriptionsClient } from "./subscriptions.js";
import { SubscriptionsSql } from "./sql/subscriptions.sql.js";
import type { Currency } from "../telegram/api/groups/payments/payments-types.js";

vi.mock("../logger/index");

const dbConfig = {
  user: "spy-user",
  password: "not-me",
  host: "localhost",
  database: "test-db",
  port: 5432,
};

const testUserId = asUserId__test(12313);
const testChargeId = asPaymentChargeId__test("test-another-payment-id");
const testAmount = 1231;
const testCurrency: Currency = "XTR";
const testSubscriptionId = asSubscriptionId__test("random-subscription-id");

let testPool = new MockPool(dbConfig);
let client = new SubscriptionsClient(testPool);

describe("Subscriptions DB", () => {
  beforeEach(() => {
    testPool = new MockPool(dbConfig);
    client = new SubscriptionsClient(testPool);
  });

  afterEach(() => {
    expect(testPool.isDone()).toBe(true);
  });

  describe("not initialized", () => {
    it("can not get rows by date", async () => {
      await expect(client.getRowsByDate(new Date())).rejects.toThrowError(
        "The table subscriptions is not initialized yet",
      );
    });

    it("can not get rows by userId", async () => {
      await expect(client.getRowsByUserId(asUserId__test(1231), 20)).rejects.toThrowError(
        "The table subscriptions is not initialized yet",
      );
    });

    it("can not create row", async () => {
      await expect(
        client.createRow(
          asUserId__test(123432543),
          asPaymentChargeId__test("some-payment id"),
          new Date(),
          100,
          "XTR",
          true,
        ),
      ).rejects.toThrowError("The table subscriptions is not initialized yet");
    });

    it("can not mark subscription is canceled", async () => {
      await expect(client.markAsCanceled(asSubscriptionId__test("subscr-id"))).rejects.toThrowError(
        "The table subscriptions is not initialized yet",
      );
    });
  });

  describe("initialized", () => {
    beforeEach(() => {
      testPool.mockQuery(SubscriptionsSql.createTable, () => Promise.resolve());
      testPool.mockQuery(SubscriptionsSql.createUserIdAndEndDateIndex, () => Promise.resolve());
      return client.init();
    });

    describe("creates a new row", () => {
      it("creates a row", async () => {
        const endDate = new Date();
        const isTrial = true;

        testPool.mockQuery(SubscriptionsSql.insertRow, (values) => {
          expect(values).toHaveLength(11);
          const [
            rSubscriptionId,
            rUserId,
            rAmount,
            rCurrency,
            rStartedAt,
            rEndDate,
            rIsCanceled,
            rIsTrial,
            rChargeId,
            rCreatedAt,
            rUpdatedAt,
          ] = values;

          expect(rUserId).toBe(testUserId);
          expect(rChargeId).toBe(testChargeId);
          expect(rEndDate).toBe(endDate);
          expect(rAmount).toBe(testAmount);
          expect(rCurrency).toBe(testCurrency);
          expect(rIsTrial).toBe(isTrial);

          return Promise.resolve({
            rows: [
              {
                subscription_id: rSubscriptionId,
                user_id: rUserId,
                amount: rAmount,
                currency: rCurrency,
                is_canceled: rIsCanceled,
                is_trial: rIsTrial,
                charge_id: rChargeId,
                start_date: rStartedAt,
                end_date: rEndDate,
                created_at: rCreatedAt,
                updated_at: rUpdatedAt,
              },
            ],
          });
        });

        const row = await client.createRow(
          testUserId,
          testChargeId,
          endDate,
          testAmount,
          testCurrency,
          true,
        );

        expect(row.user_id).toBe(testUserId);
        expect(row.charge_id).toBe(testChargeId);
        expect(row.end_date).toBe(endDate);
        expect(row.amount).toBe(testAmount);
        expect(row.currency).toBe(testCurrency);
        expect(row.is_trial).toBe(isTrial);
      });

      it("bubbles up the error", async () => {
        const err = new Error("something went wrong");
        testPool.mockQuery(SubscriptionsSql.insertRow, () => {
          return Promise.reject(err);
        });

        await expect(
          client.createRow(testUserId, testChargeId, new Date(), testAmount, testCurrency, true),
        ).rejects.toThrowError(err);
      });
    });

    describe("mark subscription as canceled", () => {
      it("should mark row as canceled", async () => {
        testPool.mockQuery(SubscriptionsSql.toggleCanceled, (values) => {
          expect(values).toHaveLength(3);
          const [rIsCanceled, rUpdatedAt, rSubscriptionId] = values;

          expect(rSubscriptionId).toBe(testSubscriptionId);

          return Promise.resolve({
            rows: [
              {
                subscription_id: rSubscriptionId,
                user_id: testUserId,
                amount: testAmount,
                currency: testCurrency,
                is_canceled: rIsCanceled,
                is_trial: false,
                charge_id: testChargeId,
                start_date: new Date(),
                end_date: new Date(),
                created_at: new Date(),
                updated_at: rUpdatedAt,
              },
            ],
          });
        });

        const row = await client.markAsCanceled(testSubscriptionId);

        expect(row.is_canceled).toBe(true);
      });

      it("bubbles up the error", async () => {
        const err = new Error("something went wrong");
        testPool.mockQuery(SubscriptionsSql.toggleCanceled, () => {
          return Promise.reject(err);
        });

        await expect(client.markAsCanceled(testSubscriptionId)).rejects.toThrowError(err);
      });
    });

    describe("get rows by date", () => {
      it("should get rows by date", async () => {
        const endDate = new Date();
        testPool.mockQuery(SubscriptionsSql.getRowsByDate, (values) => {
          expect(values).toHaveLength(1);
          const [rEndDate] = values;

          expect(rEndDate).toBe(endDate);

          return Promise.resolve({
            rows: [
              {
                subscription_id: testSubscriptionId,
                user_id: testUserId,
                amount: testAmount,
                currency: testCurrency,
                is_canceled: false,
                is_trial: false,
                charge_id: testChargeId,
                start_date: new Date(),
                end_date: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          });
        });

        const rows = await client.getRowsByDate(endDate);

        expect(rows).toHaveLength(1);
      });

      it("bubbles up the error", async () => {
        const err = new Error("something went wrong");
        testPool.mockQuery(SubscriptionsSql.getRowsByDate, () => {
          return Promise.reject(err);
        });

        await expect(client.getRowsByDate(new Date())).rejects.toThrowError(err);
      });
    });

    describe("get rows by userId", () => {
      it("should get rows by userId", async () => {
        const limit = 10;
        testPool.mockQuery(SubscriptionsSql.getRowsByUserId, (values) => {
          expect(values).toHaveLength(2);
          const [rUserId, rLimit] = values;

          expect(rUserId).toBe(testUserId);
          expect(rLimit).toBe(limit);

          return Promise.resolve({
            rows: [
              {
                subscription_id: testSubscriptionId,
                user_id: testUserId,
                amount: testAmount,
                currency: testCurrency,
                is_canceled: true,
                is_trial: false,
                charge_id: testChargeId,
                start_date: new Date(),
                end_date: new Date(),
                created_at: new Date(),
                updated_at: new Date(),
              },
            ],
          });
        });

        const rows = await client.getRowsByUserId(testUserId, 10);

        expect(rows).toHaveLength(1);
      });

      it("bubbles up the error", async () => {
        const err = new Error("something went wrong");
        testPool.mockQuery(SubscriptionsSql.getRowsByUserId, () => {
          return Promise.reject(err);
        });

        await expect(client.getRowsByUserId(testUserId, 10)).rejects.toThrowError(err);
      });
    });
  });
});
