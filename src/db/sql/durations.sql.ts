const createTable = `
    CREATE TABLE IF NOT EXISTS durations (
        durations_id varchar(20) PRIMARY KEY,
        chat_id bigint UNIQUE NOT NULL,
        duration bigint NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const insertRow = `
      INSERT INTO durations(durations_id, chat_id, duration, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5)
      RETURNING durations_id, chat_id, duration, created_at, updated_at;
`;

export const DurationsSql = {
  createTable,
  insertRow,
};
