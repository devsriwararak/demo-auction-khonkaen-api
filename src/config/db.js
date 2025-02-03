import mysql from 'mysql2/promise'
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// pool.getConnection()
//   .then(conn => {
//     console.log('Database connected successfully!');
//     conn.release(); // ปล่อย connection เมื่อทดสอบเสร็จ
//   })
//   .catch(err => {
//     console.error('Database connection failed:', err.message);
//   });


export default pool