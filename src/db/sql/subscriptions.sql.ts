const TABLE_NAME = "subscriptions";

const createTable = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        subscription_id SERIAL PRIMARY KEY,
        chat_id bigint NOT NULL,
        user_id bigint NOT NULL,
        amount bigint NOT NULL,
        currency varchar(3) NOT NULL,
        start_date timestamptz NOT NULL,
        end_date timestamptz NOT NULL,
        is_stopped boolean NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const getRows = `
      SELECT subscription_id, chat_id, user_id, amount, currency, start_date, end_date, is_stopped, created_at, updated_at
       FROM ${TABLE_NAME}
       WHERE end_date >= $1
       ORDER BY created_at;
     `;

const insertRow = `
      INSERT INTO ${TABLE_NAME}(subscription_id, chat_id, user_id, amount, currency, start_date, end_date, is_stopped, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING subscription_id, chat_id, user_id, amount, currency, start_date, end_date, is_stopped, created_at, updated_at;
`;

const updateRow = `
      UPDATE ${TABLE_NAME} SET
        end_date=$1,
        is_stopped=$2,
        updated_at=$3
      WHERE subscription_id=$4
      RETURNING subscription_id, chat_id, user_id, amount, currency, start_date, end_date, is_stopped, created_at, updated_at;
    `;

export const SubscriptionsSql = {
  createTable,
  insertRow,
  updateRow,
  getRows,
};
