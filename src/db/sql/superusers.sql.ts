const createTable = `
    CREATE TABLE IF NOT EXISTS superusers (
        user_id SERIAL PRIMARY KEY,
        chat_id bigint UNIQUE NOT NULL,
        token varchar(20) NOT NULL,
        created_at timestamptz NOT NULL
    );
`;

const getRows = `
      SELECT user_id, chat_id, token, created_at
       FROM superusers
       ORDER BY created_at
      LIMIT 50;
     `;

export const SuperusersSql = {
  createTable,
  getRows,
};
