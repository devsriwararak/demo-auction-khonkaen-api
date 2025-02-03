<<<<<<< HEAD
import db from "../config/db.js";
import ExcelJS from "exceljs";

// Node.js
export const getAll = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const { startDate, endDate, search } = req.body;

    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM auction_title `;
    let countParams = [];

    // SQL main Page
    let sql = `SELECT 
        id, name , 
        DATE_FORMAT(date, '%d/%m/%Y') as date ,
        status
        FROM auction_title `;

    let whereConditions = [];
    let params = [];

    if (startDate && endDate) {
      whereConditions.push(` date BETWEEN ? AND ? `);
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    }
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
    if(page === 0){
      sql += ` ORDER BY date DESC LIMIT ?  `;
      params.push(20)
    }else {
      sql += ` ORDER BY date DESC LIMIT ? OFFSET ? `;
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
    const { name, date, id } = req.body;
    let checkId = false;
    console.log(req.body);
    

    if (!name && !date)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    if (id) checkId = true;

    // Check ซ้ำ เฉพาะ วันนี้ วันอื่นไม่เป็นไร
    const sqlCheck = `SELECT id FROM auction_title WHERE name = ? AND date = ? AND id != ? `;
    const [resultCheck] = await pool.query(sqlCheck, [name, date, id]);
    if (resultCheck.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    if (!checkId) {
      //บันทึก
      const sql = `INSERT INTO auction_title (name, date) VALUES (?, ?)`;
      await pool.query(sql, [name, date]);
      return res.status(200).json({ message: "บันทึกสำเร็จ" });
    }

    if (checkId) {
      //บันทึก
      const sql = `UPDATE auction_title SET name = ?, date = ? WHERE id = ?`;
      await pool.query(sql, [name, date, id]);
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
        id,name , 
        DATE_FORMAT(date, '%Y-%m-%d') as date 
        FROM auction_title WHERE id = ?`;
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
    const sql = `DELETE FROM auction_title WHERE id = ?`;
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
      name, 
      DATE_FORMAT(date, '%d/%m/%Y') as date,
      status 
      FROM auction_title `;

    let whereConditions = [];
    let params = [];

    if (startDate && endDate) {
      whereConditions.push(` date BETWEEN ? AND ? `);
      params.push(startDate, endDate);
    }
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
      { header: "Date", key: "date", width: 15 },
      { header: "Status", key: "status", width: 10 },
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
};

=======
import db from "../config/db.js";
import ExcelJS from "exceljs";

// Node.js
export const getAll = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const { startDate, endDate, search } = req.body;

    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM auction_title `;
    let countParams = [];

    // SQL main Page
    let sql = `SELECT 
        id, name , 
        DATE_FORMAT(date, '%d/%m/%Y') as date ,
        status
        FROM auction_title `;

    let whereConditions = [];
    let params = [];

    if (startDate && endDate) {
      whereConditions.push(` date BETWEEN ? AND ? `);
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    }
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
    if(page === 0){
      sql += ` ORDER BY date DESC LIMIT ?  `;
      params.push(20)
    }else {
      sql += ` ORDER BY date DESC LIMIT ? OFFSET ? `;
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
    const { name, date, id } = req.body;
    let checkId = false;
    console.log(req.body);
    

    if (!name && !date)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    if (id) checkId = true;

    // Check ซ้ำ เฉพาะ วันนี้ วันอื่นไม่เป็นไร
    const sqlCheck = `SELECT id FROM auction_title WHERE name = ? AND date = ? AND id != ? `;
    const [resultCheck] = await pool.query(sqlCheck, [name, date, id]);
    if (resultCheck.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    if (!checkId) {
      //บันทึก
      const sql = `INSERT INTO auction_title (name, date) VALUES (?, ?)`;
      await pool.query(sql, [name, date]);
      return res.status(200).json({ message: "บันทึกสำเร็จ" });
    }

    if (checkId) {
      //บันทึก
      const sql = `UPDATE auction_title SET name = ?, date = ? WHERE id = ?`;
      await pool.query(sql, [name, date, id]);
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
        id,name , 
        DATE_FORMAT(date, '%Y-%m-%d') as date 
        FROM auction_title WHERE id = ?`;
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
    const sql = `DELETE FROM auction_title WHERE id = ?`;
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
      name, 
      DATE_FORMAT(date, '%d/%m/%Y') as date,
      status 
      FROM auction_title `;

    let whereConditions = [];
    let params = [];

    if (startDate && endDate) {
      whereConditions.push(` date BETWEEN ? AND ? `);
      params.push(startDate, endDate);
    }
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
      { header: "Date", key: "date", width: 15 },
      { header: "Status", key: "status", width: 10 },
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
};

>>>>>>> cd9e817317f80d1d7d35d8dd117121576314e6af
