import db from "../config/db.js";

export const getAllCustomer = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const sql = `SELECT * FROM customer`;
    const [result] = await db.query(sql);
    return res.json(result);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "ไม่พบข้อมูล" });
  } finally {
    if (pool) {
      pool.release();
    }
  }
};
