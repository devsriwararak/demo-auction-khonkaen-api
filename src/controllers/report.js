import db from "../config/db.js";
import ExcelJS from "exceljs";


export const sumAll = async (req, res) => {
  const { dateStart, dateEnd } = req.body;
  let pool = await db.getConnection();
  try {
    // ประมูล หาเงินสด
    const sqlAuctionCash_1 = `SELECT SUM(price) AS  total_price  FROM auction WHERE date BETWEEN ? AND ? AND status = 2  `;
    const [resultSqlAuctionCash_1] = await pool.query(sqlAuctionCash_1, [
      dateStart,
      dateEnd,
    ]);

    // ประมูล หาเชื่อ
    const sqlAuctionCash_2 = `SELECT SUM(price) AS  total_price  FROM auction WHERE date BETWEEN ? AND ? AND status = 1  `;
    const [resultSqlAuctionCash_2] = await pool.query(sqlAuctionCash_2, [
      dateStart,
      dateEnd,
    ]);

    // ขายสินค้า หาเงินสด
    const sqlSaleCash_1 = `SELECT SUM(price) AS  total_price  FROM sale WHERE date BETWEEN ? AND ? AND status = 2  `;
    const [resultSqlSaleCash_1] = await pool.query(sqlSaleCash_1, [
      dateStart,
      dateEnd,
    ]);

    // ขายสินค้า หาเชื่อ
    const sqlSaleCash_2 = `SELECT SUM(price) AS  total_price  FROM sale WHERE date BETWEEN ? AND ? AND status = 1  `;
    const [resultSqlSaleCash_2] = await pool.query(sqlSaleCash_2, [
      dateStart,
      dateEnd,
    ]);

    // ประมูล หาเงินสด  ประมูล หาเชื่อ
    const auctionSum_1 = resultSqlAuctionCash_1[0].total_price || 0;
    const auctionSum_2 = resultSqlAuctionCash_2[0].total_price || 0;

    // ขายสินค้า หาเงินสด ขายสินค้า หาเชื่อ
    const saleSum_1 = resultSqlSaleCash_1[0].total_price || 0;
    const saleSum_2 = resultSqlSaleCash_2[0].total_price || 0;

    const totalCash_1 = Number(auctionSum_1) + Number(saleSum_1);
    const totalCash_2 = Number(auctionSum_2) + Number(saleSum_2);
    const total = totalCash_1 + totalCash_2;

    return res.status(200).json({
      auctionSum_1,
      auctionSum_2,
      saleSum_1,
      saleSum_2,
      totalCash_1,
      totalCash_2,
      total,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const reportListAll = async (req, res) => {
  const { dateStart, dateEnd, billType } = req.body;
  let pool = await db.getConnection();
  console.log(req.body);

  try {
    let type = "";
    billType === 1 && (type = "auction");
    billType === 2 && (type = "sale");

    // หา สลากออมสิน ล็อตเตอรี่
    const sqlTitle = `SELECT SUM(government) AS government , SUM(lottery) AS lottery FROM ${type} WHERE date BETWEEN ? AND ? AND status = ? `;
    const [resultSqlTitle] = await pool.query(sqlTitle, [
      dateStart,
      dateEnd,
      2,
    ]);

    // หา ID main auction และ sale
    const sqlmain = `SELECT id FROM ${type} WHERE date BETWEEN ? AND ? AND status = ? `;
    const [resultSqlMain] = await pool.query(sqlmain, [dateStart, dateEnd, 2]);

    let resultList = [];
    for (const item of resultSqlMain) {
      const sqlList = `SELECT product_name, qty, unit FROM ${type}_product_list WHERE ${type}_id = ?  `;
      const [rows] = await pool.query(sqlList, [item.id]);
      resultList.push(...rows);
    }

    console.log(resultList);

    const government = resultSqlTitle[0].government || 0;
    const lottery = resultSqlTitle[0].lottery || 0;
    return res.status(200).json({
      government,
      lottery,
      resultList,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const reportLogin = async (req, res) => {
  const { search, dateStart, dateEnd } = req.body;
  let pool = await db.getConnection();

  try {
    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM log_login LEFT JOIN users ON log_login.user_id = users.id `;
    let countParams = [];

    // SQL main Page
    let sql = `
    SELECT users.username , type ,
    DATE_FORMAT(date, '%d/%m/%Y') as date , time
    FROM log_login 
    LEFT JOIN users ON log_login.user_id = users.id
    `;

    let whereConditions = [];
    let params = [];

    if (dateStart && dateEnd) {
      whereConditions.push(` log_login.date BETWEEN ? AND ? `);
      params.push(dateStart, dateEnd);
      countParams.push(dateStart, dateEnd);
    }

    if (search) {
      whereConditions.push(` users.username LIKE ? `);
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // ถ้ามีเงื่อนไข ต่างๆ
    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
      countSql += ` WHERE ` + whereConditions.join(" AND ");
    }

    // Data Main Page
    sql += ` ORDER BY log_login.id DESC LIMIT ? OFFSET ? `;
    params.push(limit, offset);
    const [result] = await pool.query(sql, params);

    // Data Total Page
    const [countResult] = await pool.query(countSql, countParams);
    const totalCount = countResult[0].totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    console.log(result);

    return res.status(200).json({
      result,
      totalPages: totalPages,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const exportToExcel = async (req, res) => {
  const { dateStart, dateEnd, billType } = req.query;
  console.log(req.query);

  
  
  let pool = await db.getConnection();
  try {

    let type = "";
    if(billType == 1) {
      type = "auction"
    }
    if(billType == 2) {
      type = "sale"
    }

    // หา สลากออมสิน ล็อตเตอรี่
    // Error: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near 'WHERE date BETWEEN '2025-02-06' AND '2025-02-10' AND status = 2' at line 1
    const sqlTitle = `SELECT SUM(government) AS government , SUM(lottery) AS lottery FROM ${type} WHERE date BETWEEN ? AND ? AND status = ?  `;
    const [resultSqlTitle] = await pool.query(sqlTitle, [
      dateStart,
      dateEnd,
      2,
    ]);

    console.log({sqlTitle});
    

     // หา ID main auction และ sale
     const sqlmain = `SELECT id FROM ${type} WHERE date BETWEEN ? AND ? AND status = ? `;
     const [resultSqlMain] = await pool.query(sqlmain, [dateStart, dateEnd, 2]);
 
     let resultList = [];
     for (const item of resultSqlMain) {
       const sqlList = `SELECT product_name, qty, unit FROM ${type}_product_list WHERE ${type}_id = ?  `;
       const [rows] = await pool.query(sqlList, [item.id]);
       resultList.push(...rows);
     }


    const government = resultSqlTitle[0].government || 0;
    const lottery = resultSqlTitle[0].lottery || 0;
 

    // สร้างไฟล์ Excel
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Auction ");

    // เพิ่มหัวข้อ
    worksheet.columns = [
      { header: "สลากออมสิน", key: "government", width: 10 },
      { header: "ล็อตเตอรี่", key: "lottery", width: 10 },
      { header: "สินค้า", key: "product_name", width: 10 },
      { header: "จำนวน", key: "qty", width: 10 },
      { header: "หน่วยนับ", key: "unit", width: 10 },
    

    ];

    worksheet.addRow({
      government,
      lottery, 
      product_name : "",
      qty : "",
      unit : ""
    })

    // เพิ่มข้อมูล
    resultList.forEach((row) => {
      worksheet.addRow({
       government:"",
       lottery: "",
       ...row,
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
