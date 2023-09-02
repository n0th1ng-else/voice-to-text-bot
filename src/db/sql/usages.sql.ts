const TABLE_NAME = "usages";

const createTable = `
      CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
        usage_id varchar(20) PRIMARY KEY,
        chat_id bigint UNIQUE NOT NULL,
        user_name text NOT NULL,
        usage_count bigint NOT NULL,
        lang_id varchar(20) NOT NULL,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL
      );
    `;

const insertRow = `
      INSERT INTO ${TABLE_NAME}(usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at) 
      VALUES($1, $2, $3, $4, $5, $6, $7)
      RETURNING usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at;
    `;

const updateRow = `
      UPDATE ${TABLE_NAME} SET
        user_name=$1,
        usage_count=$2,
        lang_id=$3,
        updated_at=$4
      WHERE usage_id=$5
      RETURNING usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at;
    `;

const updateRowWithDate = `
      UPDATE ${TABLE_NAME} SET
        user_name=$1,
        usage_count=$2,
        lang_id=$3,
        created_at=$4,
        updated_at=$5
      WHERE usage_id=$6
      RETURNING usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at;
    `;

const getRows = `
      SELECT usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at 
      FROM ${TABLE_NAME} 
      WHERE chat_id=$1 
      ORDER BY created_at;
    `;

const statRows = `
      SELECT usage_id, chat_id, user_name, usage_count, lang_id, created_at, updated_at
      FROM ${TABLE_NAME} 
      WHERE usage_count>=$1 
      AND created_at BETWEEN $2 AND $3
      ORDER BY created_at;
    `;

export const UsagesSql = {
  createTable,
  insertRow,
  updateRow,
  updateRowWithDate,
  getRows,
  statRows,
};
