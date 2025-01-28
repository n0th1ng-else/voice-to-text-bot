import { type Pool as MockPool } from "../../../src/db/__mocks__/pg.ts";
import { type BotStatRecordModel } from "../../helpers.ts";
import { DonationsSql } from "../../../src/db/sql/donations.sql.ts";
import { expect } from "vitest";
import {
  type DonationRowScheme,
  DonationStatus,
} from "../../../src/db/sql/donations.ts";

export const mockCreateDonationRow = (
  pool: MockPool,
  item: BotStatRecordModel,
  price: number,
  donationId: number,
): Promise<void> => {
  return new Promise((resolve) => {
    pool.mockQuery(DonationsSql.insertRow, (values) => {
      expect(values).toHaveLength(5);
      const [rChatId, rStatus, rPrice] = values;

      expect(rChatId).toBe(item.chatId);
      expect(rStatus).toBe(DonationStatus.Initialized);
      expect(rPrice).toBe(price);

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
  chatId: number,
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
