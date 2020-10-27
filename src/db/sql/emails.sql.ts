const createTable = `
    CREATE TABLE IF NOT EXISTS usedemails (
        email_id SERIAL PRIMARY KEY,
        email varchar(100) NOT NULL,        
        start_at timestamptz NOT NULL,
        stop_at timestamptz
    );
`;

const insertRow = `
      INSERT INTO usedemails(email, start_at) 
      VALUES($1, $2)
      RETURNING email_id, email, start_at, stop_at;
    `;

const updateRow = `
      UPDATE usedemails SET
        stop_at=$1
      WHERE email_id=$2
      RETURNING email_id, email, start_at, stop_at;
    `;

const getRows = `
      SELECT email_id, email, start_at, stop_at
       FROM usedemails
       WHERE email=$1
       ORDER BY start_at;
     `;

export const UsedEmailsSql = {
  createTable,
  insertRow,
  updateRow,
  getRows,
};
