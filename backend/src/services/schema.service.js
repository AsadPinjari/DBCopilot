const mysql = require("mysql2/promise");

async function getDatabaseSchema(config) {
    const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database
    });

    try {
        // --------------------------------
        // 1. Get tables
        // --------------------------------

        const [tables] = await connection.query(`
            SELECT TABLE_NAME
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_SCHEMA = ?
            AND TABLE_TYPE = 'BASE TABLE'
        `, [config.database]);


        // --------------------------------
        // 2. Get columns
        // --------------------------------

        const [columns] = await connection.query(`
            SELECT
                TABLE_NAME,
                COLUMN_NAME,
                DATA_TYPE,
                IS_NULLABLE,
                COLUMN_KEY,
                COLUMN_DEFAULT
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = ?
            ORDER BY TABLE_NAME, ORDINAL_POSITION
        `, [config.database]);


        // --------------------------------
        // 3. Get foreign keys
        // --------------------------------

        const [foreignKeys] = await connection.query(`
            SELECT
                TABLE_NAME,
                COLUMN_NAME,
                REFERENCED_TABLE_NAME,
                REFERENCED_COLUMN_NAME
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = ?
            AND REFERENCED_TABLE_NAME IS NOT NULL
        `, [config.database]);


        // --------------------------------
        // 4. Build canonical schema
        // --------------------------------

        const schema = {
            database: config.database,
            tables: []
        };


        // Create table objects

        for (const table of tables) {

            const tableName = table.TABLE_NAME;

            const tableObject = {
                name: tableName,
                columns: []
            };


            // Find columns belonging to this table

            const tableColumns = columns.filter(
                column => column.TABLE_NAME === tableName
            );


            for (const column of tableColumns) {

                tableObject.columns.push({
                    name: column.COLUMN_NAME,
                    type: column.DATA_TYPE,
                    nullable: column.IS_NULLABLE === "YES",
                    primaryKey: column.COLUMN_KEY === "PRI",
                    unique: column.COLUMN_KEY === "UNI",
                    default: column.COLUMN_DEFAULT
                });
            }


            // Find relationships belonging to this table

            tableObject.relationships = foreignKeys
                .filter(
                    foreignKey =>
                        foreignKey.TABLE_NAME === tableName
                )
                .map(foreignKey => ({
                    column: foreignKey.COLUMN_NAME,
                    references: {
                        table: foreignKey.REFERENCED_TABLE_NAME,
                        column: foreignKey.REFERENCED_COLUMN_NAME
                    }
                }));


            schema.tables.push(tableObject);
        }


        return schema;

    } finally {
        await connection.end();
    }
}

module.exports = {
    getDatabaseSchema
};