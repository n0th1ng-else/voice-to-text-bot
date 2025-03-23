import { expect } from "vitest";
import { type Pool as MockPool } from "../../../src/db/__mocks__/pg.js";
import { type BotStatRecordModel } from "../../helpers.js";
import { DonationsSql } from "../../../src/db/sql/donations.sql.js";
import {
  type DonationRowScheme,
  DonationStatus,
} from "../../../src/db/sql/donations.js";
import type { ChatId } from "../../../src/telegram/api/core.js";
import type { Currency } from "../../../src/telegram/api/groups/payments/payments-types.js";

export const mockCreateDonationRow = (
  pool: MockPool,
  item: BotStatRecordModel,
  price: number,
  currency: Currency,
  donationId: number,
): Promise<void> => {
  return new Promise((resolve) => {
    pool.mockQuery(DonationsSql.insertRow, (values) => {
      expect(values).toHaveLength(6);
      const [rChatId, rStatus, rPrice, rCurrency] = values;

      expect(rChatId).toBe(item.chatId);
      expect(rStatus).toBe(DonationStatus.Initialized);
      expect(rPrice).toBe(price);
      expect(rCurrency).toBe(currency);

      resolve();

      return Promise.resolve({
        rows: [
          getDbDto(item.chatId, price, DonationStatus.Initialized, donationId),
        ],
      });
    });
  });
};

const getDbDto = (
  chatId: ChatId,
  price: number,
  status: string,
  donationId: number,
): DonationRowScheme => {
  return {
    donation_id: donationId,
    status,
    chat_id: chatId,
    price: price,
    created_at: new Date(),
    updated_at: new Date(),
  };
};
