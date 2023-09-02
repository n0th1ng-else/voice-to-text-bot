import { expect } from "@jest/globals";
import { Pool as MockPool } from "../../../src/db/__mocks__/pg.js";
import { IgnoredChatsSql } from "../../../src/db/sql/ignoredchats.sql.js";
import type { IgnoredChatRowScheme } from "../../../src/db/sql/ignoredchats.js";

export const mockGetIgnoredChatsRow = (
  pool: MockPool,
  chatId: number,
  ignore: boolean,
): Promise<void> => {
  return new Promise((resolve) => {
    pool.mockQuery(IgnoredChatsSql.getRows, (values) => {
      expect(values).toHaveLength(1);
      const [rChatId] = values;
      expect(rChatId).toBe(chatId);

      resolve();

      return Promise.resolve({
        rows: [getDbDto(chatId, ignore)],
      });
    });
  });
};

const getDbDto = (chatId: number, ignore: boolean): IgnoredChatRowScheme => {
  return {
    ignored_chat_id: "",
    chat_id: chatId,
    ignore: ignore,
    created_at: new Date(),
    updated_at: new Date(),
  };
};
