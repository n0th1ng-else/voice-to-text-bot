const TABLE_NAME = "usedemails";

const createTable = `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        email_id SERIAL PRIMARY KEY,
        email varchar(100) NOT NULL,        
        start_at timestamptz NOT NULL,
        stop_at timestamptz
    );
`;

const insertRow = `
      INSERT INTO ${TABLE_NAME}(email, start_at) 
      VALUES($1, $2)
      RETURNING email_id, email, start_at, stop_at;
    `;

const updateRow = `
      UPDATE ${TABLE_NAME} SET
        stop_at=$1
      WHERE email_id=$2
      RETURNING email_id, email, start_at, stop_at;
    `;

const getRows = `
      SELECT email_id, email, start_at, stop_at
       FROM ${TABLE_NAME}
       WHERE email=$1
       ORDER BY start_at;
     `;

export const UsedEmailsSql = {
  createTable,
  insertRow,
  updateRow,
  getRows,
};
