const TABLE_NAME = "donations";

const createTable = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        donation_id SERIAL PRIMARY KEY,
        chat_id bigint NOT NULL,
        status varchar(15) NOT NULL,
        price bigint NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const migration_22032025_1 = `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS charge_id varchar(255);`;

const migration_22032025_2 = `ALTER TABLE ${TABLE_NAME} ADD COLUMN IF NOT EXISTS currency varchar(3);`;

const insertRow = `
      INSERT INTO ${TABLE_NAME}(chat_id, status, price, currency, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING donation_id, chat_id, status, price, currency, charge_id, created_at, updated_at;
    `;

const updateRow = `
      UPDATE ${TABLE_NAME} SET
        status=$1,
        charge_id=$2,
        updated_at=$3
      WHERE donation_id=$4
      RETURNING donation_id, chat_id, status, price, currency, charge_id, created_at, updated_at;
    `;

const getRows = `
      SELECT donation_id, chat_id, status, price, currency, charge_id, created_at, updated_at
       FROM ${TABLE_NAME}
       WHERE status=$1
       ORDER BY created_at;
     `;

export const DonationsSql = {
  createTable,
  migration_22032025_1,
  migration_22032025_2,
  insertRow,
  updateRow,
  getRows,
};
