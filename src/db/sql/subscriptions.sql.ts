const TABLE_NAME = "subscriptions";

const createTable = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        subscription_id varchar(20) PRIMARY KEY,
        user_id bigint NOT NULL,
        amount bigint NOT NULL,
        currency varchar(3) NOT NULL,
        start_date timestamptz NOT NULL,
        end_date timestamptz NOT NULL,
        is_canceled boolean NOT NULL,
        is_trial boolean NOT NULL,
        charge_id varchar(255) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const createUserIdAndEndDateIndex = `CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id_end_date ON ${TABLE_NAME} (user_id, end_date DESC);`;

const getRowsByDate = `
    SELECT subscription_id, user_id, amount, currency, start_date, end_date, is_canceled, is_trial, charge_id, created_at, updated_at
        FROM ${TABLE_NAME}
        WHERE end_date >= $1
        ORDER BY created_at;
     `;

const getRowsByUserId = `
    SELECT subscription_id, user_id, amount, currency, start_date, end_date, is_canceled, is_trial, charge_id, created_at, updated_at
        FROM ${TABLE_NAME}
        WHERE user_id = $1
        ORDER BY end_date DESC
        LIMIT $2;
     `;

const insertRow = `
    INSERT INTO ${TABLE_NAME}(subscription_id, user_id, amount, currency, start_date, end_date, is_canceled, is_trial, charge_id, created_at, updated_at) 
        VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING subscription_id, user_id, amount, currency, start_date, end_date, is_canceled, is_trial, charge_id, created_at, updated_at;
`;

const toggleCanceled = `
    UPDATE ${TABLE_NAME}
        SET is_canceled=$1, updated_at=$2
        WHERE subscription_id=$3
        RETURNING subscription_id, user_id, amount, currency, start_date, end_date, is_canceled, is_trial, charge_id, created_at, updated_at;
`;

export const SubscriptionsSql = {
  createTable,
  createUserIdAndEndDateIndex,
  insertRow,
  getRowsByDate,
  getRowsByUserId,
  toggleCanceled,
};
