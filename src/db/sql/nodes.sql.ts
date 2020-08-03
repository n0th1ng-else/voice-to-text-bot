const createTable = `
    CREATE TABLE IF NOT EXISTS nodes (
        node_id varchar(20) PRIMARY KEY,
        self_url text UNIQUE NOT NULL,
        is_active boolean NOT NULL,
        version varchar(100) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
    );
`;

const insertRow = `
      INSERT INTO nodes(node_id, self_url, is_active, version, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5, $6)
      RETURNING node_id, self_url, is_active, version, created_at, updated_at;
    `;

const updateRow = `
      UPDATE nodes SET
        is_active=$1,
        version=$2,
        updated_at=$3
      WHERE node_id=$4
      RETURNING node_id, self_url, is_active, version, created_at, updated_at;
    `;

const getRows = `
      SELECT node_id, self_url, is_active, version, created_at, updated_at 
      FROM nodes 
      WHERE self_url=$1 
      ORDER BY created_at;
    `;

export const NodesSql = {
  createTable,
  insertRow,
  updateRow,
  getRows,
};
