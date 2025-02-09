import db from "../config/db.js";
import ExcelJS from "exceljs";

export const getAllDebtor = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const { search, billType, statusType } = req.body;
    console.log(req.body);
    let sqlSelect = "";
    billType === 1 && (sqlSelect = "auction");
    billType === 2 && (sqlSelect = "sale");

    console.log(sqlSelect);

    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM ${sqlSelect} `;
    let countParams = [];

    // SQL main Page
    let sql = `
      SELECT id, code, customer_name AS name , DATE_FORMAT(date, '%d/%m/%Y') as date ,
      price , status 
      FROM ${sqlSelect} 
      `;

    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(` code LIKE ? `);
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    if (statusType) {
      whereConditions.push(` status = ? `);
      params.push(statusType);
      countParams.push(statusType);
    }

    // ถ้ามีเงื่อนไข ต่างๆ
    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
      countSql += ` WHERE ` + whereConditions.join(" AND ");
    }

    // Data Main Page
    sql += ` ORDER BY id DESC LIMIT ? OFFSET ? `;
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

export const exportToExcel = async (req, res) => {
  const { search, billType, statusType } = req.query;
  let pool = await db.getConnection();

  try {
    console.log(req.query);

    let sqlSelect = "";
    // billType === 1 && (sqlSelect = "auction")
    // billType === 2 &&  (sqlSelect = "sale")
    if (billType == 1) {
      sqlSelect = "auction";
    }
    if (billType == 2) {
      sqlSelect = "sale";
    }

    console.log({ sqlSelect });


    let sql = `
      SELECT  code, customer_name AS name , DATE_FORMAT(date, '%d/%m/%Y') as date , price , status 
      FROM ${sqlSelect} `;


    let whereConditions = [];
    let params = [];

    if (search) {
      whereConditions.push(` code LIKE ? `);
      params.push(`%${search}%`);
    }

    if (statusType) {
      whereConditions.push(` status = ? `);
      params.push(statusType);
    }

    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
    }

    const [result] = await pool.query(sql, params);

    // สร้างไฟล์ Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Auction ");

    // เพิ่มหัวข้อ
    worksheet.columns = [
      { header: "เลชที่บิล", key: "code", width: 10 },
      { header: "ผู้บริจาค", key: "name", width: 10 },
      { header: "ราคา", key: "price", width: 10 },
      { header: "วันที่", key: "date", width: 10 },
      { header: "สถานะ", key: "status", width: 10 }, 
    ];

    const statusMapping = {
      3: "ยกเลิกบิล",
      2: "ชำระเงินแล้ว",
      1: "ยังไม่ชำระเงิน",
    };

    // เพิ่มข้อมูล
    result.forEach((row) => {
      worksheet.addRow({
        code : row.code,
        name : row.name,
        price: row.price,
        date : row.date,
        status : statusMapping[row.status] || "ไม่ทราบสถานะ"
      });
    });

    // กำหนดชื่อไฟล์
    const fileName = `1234.xlsx`;

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
