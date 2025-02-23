const TABLE_NAME = "subscriptions";

const createTable = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        subscription_id SERIAL PRIMARY KEY,
        chat_id bigint NOT NULL,
        started_by bigint NOT NULL,
        status varchar(15) NOT NULL,
        amount bigint NOT NULL,
        currency varchar(3) NOT NULL,
        started_at timestamptz NOT NULL,
        ended_at timestamptz,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const getRows = `
      SELECT subscription_id, chat_id, started_by, status, amount, currency, started_at, ended_at, created_at, updated_at
       FROM ${TABLE_NAME}
       WHERE status=$1
       ORDER BY created_at;
     `;

export const SubscriptionsSql = {
  createTable,
  getRows,
};
