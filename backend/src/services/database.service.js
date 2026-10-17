const mysql = require("mysql2/promise");

async function testDatabaseConnection(config) {
    const connection = await mysql.createConnection({
        host: config.host,
        port: config.port,
        user: config.username,
        password: config.password,
        database: config.database
    });

    try {
        await connection.query("SELECT 1");
        return true;
    } finally {
        await connection.end();
    }
}

module.exports = {
    testDatabaseConnection
};