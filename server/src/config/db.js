import mysql from "mysql2/promise";
import "dotenv/config";

// One shared connection pool for the whole app using MAMP configuration
export const pool = mysql.createPool({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root", // Updated to match MAMP default
    database: process.env.DB_NAME || "optimum",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true,
});

// Wrapper: mysql2 returns [rows, fields] from execute(), so controllers receive just the rows.
export async function query(sql, params = []) {
    const [rows] = await pool.execute(sql, params);
    return rows;
}
