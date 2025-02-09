import db from "../config/db.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import moment from "moment";
dotenv.config();

const dateNow = moment().format("YYYY-MM-DD");
const timeNow = moment().format("HH:mm:ss");

export const register = async (req, res) => {
  let pool = await db.getConnection();
  const { username, password, status } = req.body;

  try {
    // เช็ค User ซ้ำ
    const checkUser = `SELECT id FROM users WHERE username = ?`;
    const [resultCheckUser] = await pool.query(checkUser, [username]);
    if (resultCheckUser.length > 0) {
      return res
        .status(400)
        .json({ message: "username นี้มีแล้ว กรุณาลองใหม่อีกครั้ง !" });
    }

    // เช็คสถานะซ้ำ
    if (status !== 0) {
      const checkStatus = `SELECT id, status FROM users WHERE status = ?`;
      const [resultCheckStatus] = await pool.query(checkStatus, [status]);

      if (resultCheckStatus.length > 0) {
        return res.status(400).json({
          message: "มีผู้ใช้งานที่มี สถานะนี้ อยู่แล้ว ไม่สามารถมีซ้ำได้",
        });
      }
    }

    // เข้ารหัส Password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // บันทึก
    const sql = `INSERT INTO users (username, password, status) VALUES (?, ?, ?)`;
    await pool.query(sql, [username, hashedPassword, status]);

    return res.status(200).json({ message: "สมัครสมาชิกสำเร็จ !!" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) {
      pool.release();
    }
  }
};

export const login = async (req, res) => {
  let pool = await db.getConnection();
  const { username, password } = req.body;

  try {
    // ค้นหาชื่อ
    const sql = `SELECT id, username , password, status FROM users WHERE username = ?`;
    const [result] = await pool.query(sql, [username]);

    if (result.length === 0) {
      return res.status(404).json({ message: "ไม่พบ Username นี้ ในระบบ" });
    }

    const user = result[0];

    //ตรวจสอบรหัสผ่าน
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      return res
        .status(401)
        .json({ message: "password ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง " });
    }

    // สร้าง JWT Token
    const payload = {
      id: user.id,
      status: user.status,
    };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    // บันทึก Token
    const sqlUpdate = `UPDATE users SET token = ? WHERE id = ?`;
    await pool.query(sqlUpdate, [token, user.id]);

    // บันทึกเวลาเข้าระบบ
    const sqlInsertLogLogin = `INSERT INTO log_login (user_id, date, time , type) VALUES (?, ?, ?, ?)`;
    await pool.query(sqlInsertLogLogin, [user.id, dateNow, timeNow, 1]);

    return res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) {
      pool.release();
    }
  }
};

export const logout = async (req, res) => {
  const { user_id } = req.body;
  let pool = await db.getConnection();

  try {
    const sqlInsertLogLogin = `INSERT INTO log_login (user_id, date, time , type) VALUES (?, ?, ?, ?)`;
    await pool.query(sqlInsertLogLogin, [user_id, dateNow, timeNow, 2]);

    // ลบ token
    const sql = `UPDATE users SET token = ? WHERE id = ?`;
    await pool.query(sql, ["", user_id]);

    return res.status(200).json({
      message: "ออกจากระบบสำเร็จ",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

// users
export const getAllUsers = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const sql = `SELECT id, username, status, token FROM users WHERE username != ? `;
    const [result] = await pool.query(sql, ["admin"]);

    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const getUserById = async (req, res) => {
  let pool = await db.getConnection();
  const { id } = req.params;

  try {
    const sql = `SELECT id, status, token FROM users WHERE username != ? AND id = ? `;
    const [result] = await pool.query(sql, ["admin", id]);

    return res.status(200).json(result[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const updateUserById = async (req, res) => {
  const { id, username, password, status } = req.body;
  let pool = await db.getConnection();
  console.log(req.body);

  try {
    if (username) {
      const sqlCheck = `SELECT id FROM users WHERE username = ? `;
      const [resultCheck] = await pool.query(sqlCheck, [username]);
      if (resultCheck.length > 0)
        return res.status(400).json({ message: "มีผู้ใช้งานนี้แล้ว" });
    }

    // บันทึก
    let sqlUpdate = `UPDATE users SET `;
    let whereConditions = [];
    let params = [];
    let tokenUpdated = false;

    if (username) {
      whereConditions.push(` username = ? `);
      params.push(username);
    }

    if (password) {
      // เข้ารหัส Password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      whereConditions.push(` password = ? `);
      params.push(hashedPassword, "");
    }

    if (status !== null) {
      whereConditions.push(` status = ?`);
      params.push(status);
    }

    if (status !== null || password) {
      if (!tokenUpdated) {
        whereConditions.push(` token = ? `);
        params.push("");
        tokenUpdated = true;
      }
    }

    if (whereConditions.length > 0) {
      sqlUpdate +=  whereConditions.join(", ");
    }

    sqlUpdate += ` WHERE id = ?`;
    params.push(id);

    console.log(sqlUpdate);
    

    await pool.query(sqlUpdate, params);
    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};
