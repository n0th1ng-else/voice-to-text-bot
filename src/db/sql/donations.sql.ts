const createTable = `
    CREATE TABLE IF NOT EXISTS donations (
        donation_id SERIAL PRIMARY KEY,
        chat_id bigint NOT NULL,
        status varchar(15) NOT NULL,
        price bigint NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const insertRow = `
      INSERT INTO donations(chat_id, status, price, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5)
      RETURNING donation_id, chat_id, status, price, created_at, updated_at;
    `;

const updateRow = `
      UPDATE donations SET
        status=$1,
        updated_at=$2
      WHERE donation_id=$3
      RETURNING donation_id, chat_id, status, price, created_at, updated_at;
    `;

const getRows = `
      SELECT donation_id, chat_id, status, price, created_at, updated_at
       FROM donations
       WHERE status=$1
       ORDER BY created_at;
     `;

export const DonationsSql = {
  createTable,
  insertRow,
  updateRow,
  getRows,
};
