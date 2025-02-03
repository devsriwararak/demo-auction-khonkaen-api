import jwt from "jsonwebtoken";
import pool from "../config/db.js";



export const authenticationToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];
    const db = await pool.getConnection();
  
  
    try {
      if (!token ) return res.status(400).json({ message: "ไม่มี Token" });
  
      // Check token ที่ส่งมา กับ DB 
      const sqlCheck = `SELECT id FROM users WHERE token = ?`
      const [resultCheck] = await db.query(sqlCheck, [token]) 
      
      if(!resultCheck.length) return res.status(400).json({message : 'Token ไม่ตรงกับระบบ'})
          
  
      jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(400).json({ message: "token ไม่ถูกต้อง" });
        req.user = user;
  
        next();
      });
    } catch (error) {
      console.log(error);
    } finally {
      db.release()
    }
  };
  