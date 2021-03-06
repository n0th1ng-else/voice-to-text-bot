import { Pool as MockPool } from "../../../src/db/__mocks__/pg";
import { BotStatRecordModel } from "../../helpers";
import { DonationsSql } from "../../../src/db/sql/donations.sql";
import { expect } from "@jest/globals";
import {
  DonationRowScheme,
  DonationStatus,
} from "../../../src/db/sql/donations";

export function mockCreateDonationRow(
  pool: MockPool,
  item: BotStatRecordModel,
  price: number
): Promise<void> {
  return new Promise((resolve) => {
    pool.mockQuery(DonationsSql.insertRow, (values) => {
      expect(values).toHaveLength(5);
      const [rChatId, rStatus, rPrice] = values;

      expect(rChatId).toBe(item.chatId);
      expect(rStatus).toBe(DonationStatus.Pending);
      expect(rPrice).toBe(price);

      resolve();

      return Promise.resolve({
        rows: [getDbDto(String(item.chatId), price, DonationStatus.Pending)],
      });
    });
  });
}

const getDbDto = (
  chatId: string,
  price: number,
  status: string
): DonationRowScheme => {
  return {
    donation_id: 234,
    status,
    chat_id: chatId,
    price: price,
    created_at: new Date(),
    updated_at: new Date(),
  };
};
