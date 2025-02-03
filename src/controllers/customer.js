<<<<<<< HEAD
import db from "../config/db.js";
import ExcelJS from "exceljs";
import { genCode } from "../config/lib.js";

// ต้องการเช็คว่า ถ้าส่ง page = 0 มา จะให้แสดงข้อมูลทั้งหมด ไม่มี LIMIT โดยไม่กระทบกับโค้ดเดิม
export const getAll = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const { search } = req.body;

    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM customer `;
    let countParams = [];

    // SQL main Page
    let sql = `
    SELECT id, code, name, tel, address_customer, address_send, contact, noun, tel, ref
    FROM customer `;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(` name LIKE ? `);
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // ถ้ามีเงื่อนไข ต่างๆ
    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
      countSql += ` WHERE ` + whereConditions.join(" AND ");
    }

    // Data Main Page
    if(page === 0 ){
      sql += ` ORDER BY id DESC LIMIT ?  `;
      params.push(20)

    }else {
      sql += ` ORDER BY id DESC LIMIT ? OFFSET ? `;
      params.push(limit, offset);
    }

    
    const [result] = await pool.query(sql, params);

    // Data Total Page
    const [countResult] = await pool.query(countSql, countParams);
    const totalCount = countResult[0].totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      result,
      totalPages: totalPages,
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

export const addNew = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const {
      id,
      name,
      address_customer,
      address_send,
      contact,
      noun,
      tel,
      ref,
    } = req.body;
    console.log(req.body);
    

    let checkId = false;

    if (!name && !tel)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    if (id) checkId = true;

    // Check ซ้ำ เฉพาะ วันนี้ วันอื่นไม่เป็นไร
    const sqlCheck = `SELECT id FROM customer WHERE name = ?  AND id != ? `;
    const [resultCheck] = await pool.query(sqlCheck, [name, id]);
    if (resultCheck.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    // ค้นหา code ล่าสุดในปีนี้
    const [rows] = await pool.query(
      `SELECT code FROM customer ORDER BY code DESC LIMIT 1`
    );
    const lastCode = rows[0]?.code || "";
    const newCode = await genCode(lastCode, "BD");

    if (!checkId) {
      //บันทึก
      const sql = `INSERT INTO customer (code, name, address_customer, address_send, contact, noun, tel, ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      await pool.query(sql, [newCode,name, address_customer, address_send, contact, noun, tel, ref]);
      return res.status(200).json({ message: "บันทึกสำเร็จ" });
    }

    if (checkId) {
      //บันทึก
      const sql = `UPDATE customer SET name = ?, address_customer = ?, address_send = ?, contact = ?, noun = ?, tel = ?, ref = ? WHERE id = ?`;
      await pool.query(sql, [name, address_customer, address_send, contact, noun, tel, ref, id]);
      return res.status(200).json({ message: "แก้ไขสำเร็จ" });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const getById = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const { id } = req.params;
    const sql = `SELECT 
        id,name, address_customer, address_send, contact, noun, tel, ref
        FROM customer WHERE id = ?`;
    const [result] = await pool.query(sql, [id]);
    return res.status(200).json(result[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const deleteById = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const { id } = req.params;
    const sql = `DELETE FROM customer WHERE id = ?`;
    await pool.query(sql, [id]);
    return res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const exportToExcel = async (req, res) => {

  const { startDate, endDate, search } = req.query;
  console.log(req.query);
  
  let pool = await db.getConnection();
  try {
    let sql = `SELECT 
      id, 
      name, address_customer, address_send, contact, noun, tel, ref 
      FROM customer `;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(` name LIKE ? `);
      params.push(`%${search}%`);
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
    }

    const [result] = await pool.query(sql, params);

    // สร้างไฟล์ Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Auction Titles");

    // เพิ่มหัวข้อ
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Name", key: "name", width: 30 },
      { header: "address_customer", key: "address_customer", width: 15 },
      { header: "address_send", key: "address_send", width: 10 },
      { header: "contact", key: "contact", width: 10 },
      { header: "noun", key: "noun", width: 10 },
      { header: "tel", key: "tel", width: 10 },
      { header: "ref", key: "ref", width: 10 },
    ];

    // เพิ่มข้อมูล
    result.forEach((row) => {
      worksheet.addRow(row);
    });

    // กำหนดชื่อไฟล์
    const fileName = `Auction_Titles_${startDate || "all"}_${
      endDate || "all"
    }.xlsx`;

    // เขียนไฟล์ Excel ลง Memory Buffer
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
=======
import db from "../config/db.js";
import ExcelJS from "exceljs";
import { genCode } from "../config/lib.js";

// ต้องการเช็คว่า ถ้าส่ง page = 0 มา จะให้แสดงข้อมูลทั้งหมด ไม่มี LIMIT โดยไม่กระทบกับโค้ดเดิม
export const getAll = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const { search } = req.body;

    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM customer `;
    let countParams = [];

    // SQL main Page
    let sql = `
    SELECT id, code, name, tel, address_customer, address_send, contact, noun, tel, ref
    FROM customer `;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(` name LIKE ? `);
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // ถ้ามีเงื่อนไข ต่างๆ
    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
      countSql += ` WHERE ` + whereConditions.join(" AND ");
    }

    // Data Main Page
    if(page === 0 ){
      sql += ` ORDER BY id DESC LIMIT ?  `;
      params.push(20)

    }else {
      sql += ` ORDER BY id DESC LIMIT ? OFFSET ? `;
      params.push(limit, offset);
    }

    
    const [result] = await pool.query(sql, params);

    // Data Total Page
    const [countResult] = await pool.query(countSql, countParams);
    const totalCount = countResult[0].totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    return res.status(200).json({
      result,
      totalPages: totalPages,
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

export const addNew = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const {
      id,
      name,
      address_customer,
      address_send,
      contact,
      noun,
      tel,
      ref,
    } = req.body;
    console.log(req.body);
    

    let checkId = false;

    if (!name && !tel)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    if (id) checkId = true;

    // Check ซ้ำ เฉพาะ วันนี้ วันอื่นไม่เป็นไร
    const sqlCheck = `SELECT id FROM customer WHERE name = ?  AND id != ? `;
    const [resultCheck] = await pool.query(sqlCheck, [name, id]);
    if (resultCheck.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    // ค้นหา code ล่าสุดในปีนี้
    const [rows] = await pool.query(
      `SELECT code FROM customer ORDER BY code DESC LIMIT 1`
    );
    const lastCode = rows[0]?.code || "";
    const newCode = await genCode(lastCode, "BD");

    if (!checkId) {
      //บันทึก
      const sql = `INSERT INTO customer (code, name, address_customer, address_send, contact, noun, tel, ref) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      await pool.query(sql, [newCode,name, address_customer, address_send, contact, noun, tel, ref]);
      return res.status(200).json({ message: "บันทึกสำเร็จ" });
    }

    if (checkId) {
      //บันทึก
      const sql = `UPDATE customer SET name = ?, address_customer = ?, address_send = ?, contact = ?, noun = ?, tel = ?, ref = ? WHERE id = ?`;
      await pool.query(sql, [name, address_customer, address_send, contact, noun, tel, ref, id]);
      return res.status(200).json({ message: "แก้ไขสำเร็จ" });
    }

  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const getById = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const { id } = req.params;
    const sql = `SELECT 
        id,name, address_customer, address_send, contact, noun, tel, ref
        FROM customer WHERE id = ?`;
    const [result] = await pool.query(sql, [id]);
    return res.status(200).json(result[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const deleteById = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const { id } = req.params;
    const sql = `DELETE FROM customer WHERE id = ?`;
    await pool.query(sql, [id]);
    return res.status(200).json({ message: "ลบสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const exportToExcel = async (req, res) => {

  const { startDate, endDate, search } = req.query;
  console.log(req.query);
  
  let pool = await db.getConnection();
  try {
    let sql = `SELECT 
      id, 
      name, address_customer, address_send, contact, noun, tel, ref 
      FROM customer `;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(` name LIKE ? `);
      params.push(`%${search}%`);
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
    }

    const [result] = await pool.query(sql, params);

    // สร้างไฟล์ Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Auction Titles");

    // เพิ่มหัวข้อ
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "Name", key: "name", width: 30 },
      { header: "address_customer", key: "address_customer", width: 15 },
      { header: "address_send", key: "address_send", width: 10 },
      { header: "contact", key: "contact", width: 10 },
      { header: "noun", key: "noun", width: 10 },
      { header: "tel", key: "tel", width: 10 },
      { header: "ref", key: "ref", width: 10 },
    ];

    // เพิ่มข้อมูล
    result.forEach((row) => {
      worksheet.addRow(row);
    });

    // กำหนดชื่อไฟล์
    const fileName = `Auction_Titles_${startDate || "all"}_${
      endDate || "all"
    }.xlsx`;

    // เขียนไฟล์ Excel ลง Memory Buffer
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
>>>>>>> cd9e817317f80d1d7d35d8dd117121576314e6af
};