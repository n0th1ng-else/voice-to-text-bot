const TABLE_NAME = "ignoredchats";

const createTable = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        row_id varchar(20) PRIMARY KEY,
        chat_id bigint UNIQUE NOT NULL,
        ignore boolean NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const getRows = `
    SELECT row_id, chat_id, ignore, created_at, updated_at
    FROM ${TABLE_NAME}
    WHERE chat_id=$1
    ORDER BY created_at;
`;

export const IgnoredChatsSql = {
  createTable,
  getRows,
};
