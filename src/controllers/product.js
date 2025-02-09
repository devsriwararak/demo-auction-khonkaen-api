import db from "../config/db.js";
import ExcelJS from "exceljs";


// Category
export const getAllCategory = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const sql = `SELECT id, name FROM category`;
    const [result] = await pool.query(sql);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  } finally {
    if (pool) pool.release();
  }
};

// Products
export const getAll = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const { category_id, search } = req.body;

    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM product `;
    let countParams = [];

    // SQL main Page
    let sql = `SELECT product.id, product.name , unit, category.name as category_name , category.id as category_id
      FROM product
      INNER JOIN category ON product.category_id = category.id
      `;

    let whereConditions = [];
    let params = [];

    if (category_id) {
      whereConditions.push(` category_id = ? `);
      params.push(category_id);
      countParams.push(category_id);
    }
    if (search) {
      whereConditions.push(` product.name LIKE ? `);
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // ถ้ามีเงื่อนไข ต่างๆ
    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
      countSql += ` WHERE ` + whereConditions.join(" AND ");
    }

    // Data Main Page
    sql += ` ORDER BY product.id DESC LIMIT ? OFFSET ? `;
    params.push(limit, offset);
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
    const { name, category_id, unit, id } = req.body;
    let checkId = false;
    console.log(req.body);

    if (!name && !category_id && !unit)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    if (id) checkId = true;

    // Check ซ้ำ เฉพาะ วันนี้ วันอื่นไม่เป็นไร
    const sqlCheck = `SELECT id FROM product WHERE name = ?  AND id != ? `;
    const [resultCheck] = await pool.query(sqlCheck, [name, id]);
    if (resultCheck.length > 0)
      return res.status(400).json({ message: "มีข้อมูลนี้แล้ว" });

    if (!checkId) {
      //บันทึก
      const sql = `INSERT INTO product (name, category_id, unit) VALUES (?, ?, ?)`;
      await pool.query(sql, [name, category_id, unit]);
      return res.status(200).json({ message: "บันทึกสำเร็จ" });
    }

    if (checkId) {
      //บันทึก
      const sql = `UPDATE product SET name = ?, category_id = ?, unit = ?  WHERE id = ?`;
      await pool.query(sql, [name, category_id, unit,  id]);
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
    const sql = `SELECT id, name, category_id, unit FROM product WHERE id = ?`;
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
    const sql = `DELETE FROM product WHERE id = ?`;
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

  const { category_id, search } = req.query;
  console.log(req.query);
  
  let pool = await db.getConnection();
  try {
    let sql = `SELECT  product.name AS name, unit , category.name AS category_name
      FROM product
      LEFT JOIN category ON product.category_id = category.id
      `;

    let whereConditions = [];
    let params = [];


    if (search) {
      whereConditions.push(` name LIKE ? `);
      params.push(`%${search}%`);
    }

    if (category_id) {
      whereConditions.push(` category_id = ? `);
      params.push(category_id);
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
      { header: "ชื่อสินค้า", key: "name", width: 10 },
      { header: "หน่วยนับ", key: "unit", width: 10 },
      { header: "หมวดหมู่", key: "category_name", width: 10 },
    
    ];

    // เพิ่มข้อมูล
    result.forEach((row) => {
      worksheet.addRow(row);
    });

    // กำหนดชื่อไฟล์
    const dateNow = Date.now()
    console.log(dateNow);
    
    const fileName = `product_${dateNow}.xlsx`;

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

