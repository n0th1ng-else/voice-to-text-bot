const createTable = `
    CREATE TABLE IF NOT EXISTS ignoredchats (
        ignored_chat_id varchar(20) PRIMARY KEY,
        chat_id bigint UNIQUE NOT NULL,
        ignore boolean NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const getRows = `
    SELECT ignored_chat_id, chat_id, ignore, created_at, updated_at
    FROM ignoredchats
    WHERE chat_id=$1
    ORDER BY created_at;
`;

export const IgnoredChatsSql = {
  createTable,
  getRows,
};
