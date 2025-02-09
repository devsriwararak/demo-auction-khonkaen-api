import moment from "moment";
import db from "../config/db.js";
import fs from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { genCode } from "../config/lib.js";
import ExcelJS from "exceljs";


// Systems
const dateNow = moment().format("YYYY-MM-DD");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getAuctionTitleForNowDay = async (req, res) => {
  let pool = await db.getConnection();
  const { date } = req.query;

  try {
    const sql = `SELECT id, name FROM auction_title WHERE date = ? AND status = ?`;
    const [result] = await pool.query(sql, [date, 0]);
    return res.status(200).json(result);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const getAllAction = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const { search, startDate, endDate } = req.body;

    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM auction `;
    let countParams = [];

    // SQL main Page
    let sql = `
    SELECT auction.id, auction.code, auction.customer_name AS name ,
    DATE_FORMAT(auction.date, '%d/%m/%Y') as date ,
    auction.price , auction.status ,
    auction_title.name AS title
    FROM auction 
    LEFT JOIN auction_title ON auction.auction_id = auction_title.id
    `;

    let whereConditions = [];
    let params = [];

    if (startDate && endDate) {
      whereConditions.push(` auction.date BETWEEN ? AND ? `);
      params.push(startDate, endDate);
      countParams.push(startDate, endDate);
    }

    if (search) {
      whereConditions.push(` code LIKE ? `);
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    // ถ้ามีเงื่อนไข ต่างๆ
    if (whereConditions.length > 0) {
      sql += ` WHERE ` + whereConditions.join(" AND ");
      countSql += ` WHERE ` + whereConditions.join(" AND ");
    }

    // Data Main Page
    sql += ` ORDER BY auction.id DESC LIMIT ? OFFSET ? `;
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

export const getDataById = async (req, res) => {
  const { id } = req.params;
  let pool = await db.getConnection();
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    let sql = `
      SELECT auction.id, auction.code, auction.note, auction.customer_id, auction.auction_id,
      auction.customer_name AS name, customer.noun, customer.ref, customer.tel, customer.address_customer, customer.address_send, customer.contact,
      DATE_FORMAT(auction.date, '%d/%m/%Y') as date ,
      auction.price , auction.status ,
      auction_title.name AS title, government, lottery, images
      FROM auction 
      LEFT JOIN customer ON auction.customer_id = customer.id
      LEFT JOIN auction_title ON auction.auction_id = auction_title.id
      WHERE auction.id = ?
      `;
    const [results] = await pool.query(sql, [id]);
    return res.status(200).json(results[0]);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const getDataProductListById = async (req, res) => {
  let pool = await db.getConnection();
  const { id } = req.params;

  try {
    const sql = `SELECT id, government, lottery FROM auction WHERE id = ?  `;
    const [result] = await pool.query(sql, [id]);
    const { government, lottery } = result[0] || 0;

    // Products
    const sqlList = `SELECT auction_product_list.id, auction_product_list.category_id, product_name, qty , category.name as category_name , auction_product_list.product_id as product_id, product.unit
    FROM auction_product_list 
    INNER JOIN category ON auction_product_list.category_id = category.id
    INNER JOIN product ON auction_product_list.product_id = product.id
    WHERE auction_id = ?`;
    const [resultList] = await pool.query(sqlList, [id]);

    // แปลงร่างก่อนส่งไปหน้าบ้าน
    const categories = [1, 2, 3, 4, 5];
    const products = categories.map((catId) => {
      // filter รายการที่ category_id = catId
      const items = resultList.filter((p) => p.category_id === catId);
      // map เป็น { id, product_name, qty }
      const results = items.map((p) => ({
        id: p.id,
        name: p.product_name,
        quantity: p.qty,
        category_name: p.category_name,
        product_id: p.product_id,
        unit: p.unit,
      }));

      return {
        category_id: catId,
        results,
      };
    });

    // Customer Data
    const sqlCustomerList = `SELECT auction_customer_list.id , customer.name AS customer_name, customer.id AS customer_id , auction_customer_list.price
    FROM auction_customer_list
    INNER JOIN customer ON auction_customer_list.customer_id = customer.id
     WHERE auction_id = ? 
     ORDER BY auction_customer_list.price DESC LIMIT 3
     `;
    const [resultCustomerList] = await pool.query(sqlCustomerList, [id]);

    const customerData = resultCustomerList.map((item) => {
      const data = {
        customer_id: item.customer_id,
        customer_name: item.customer_name,
        price: item.price,
      };
      return data;
    });

    // รวมเป็น object ตามที่ต้องการ
    const data = {
      id,
      government,
      lottery,
      products,
      customers: customerData,
    };

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const startAuction = async (req, res) => {
  const { auction_id } = req.body;
  let pool = await db.getConnection();

  try {
    if (!auction_id)
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // สร้างการประมูลใหม่
    const sqlCreate = `INSERT INTO auction (code ,auction_id, status, date) VALUES (?, ?, ?, ?)`;
    const [resultCreate] = await pool.query(sqlCreate, [
      "",
      auction_id,
      0,
      dateNow,
    ]);

    if (!resultCreate.insertId)
      return res.status(400).json({ message: "สร้างไม่สำเร็จ !" });

    const sqlNameTitle = `SELECT name FROM auction_title WHERE id = ?`;
    const [resultNameTitle] = await pool.query(sqlNameTitle, [auction_id]);

    return res.status(200).json({
      id: resultCreate.insertId,
      name: resultNameTitle[0].name,
      message: "สร้างการประมูลสำเร็จ",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const adminAddData = async (req, res) => {
  const { id, government, lottery, products, customers } = req.body;
  let pool = await db.getConnection();

  console.log(customers);

  try {
    // เช็คว่า auction_id ประมูลไปแล้วหรือยัง
    // const sqlCheckStatus = `SELECT id FROM auction WHERE id = ? AND status = ? `;
    // const [resultCheckStatus] = await pool.query(sqlCheckStatus, [id, 1]);
    // if (resultCheckStatus.length > 0)
    //   return res.status(400).json({ message: "หัวข้อนี้ประมูลไปแล้ว" });

    // UPDATE
    const sql = `UPDATE auction SET government = ?, lottery = ? WHERE id = ?  `;
    await pool.query(sql, [government, lottery, id]);

    // ลบข้อมูลเก่าก่อน
    const sqlDeleteOld = `DELETE FROM auction_product_list WHERE auction_id = ?`;
    await pool.query(sqlDeleteOld, [id]);

    // 4) Loop Insert สินค้าใหม่
    for (const cat of products) {
      const categoryId = cat.category_id;
      // cat.results = [{ name: "xxx", quantity: 20 }, ...]
      for (const item of cat.results) {
        const productName = item.name;
        const qty = item.quantity;
        const product_id = item.product_id;
        const unit = item.unit

        // Insert ลงตาราง
        const sqlInsert = `
            INSERT INTO auction_product_list
            (auction_id, category_id, product_name, qty, unit, product_id)
            VALUES (?, ?, ?, ?, ?, ?)
          `;
        await pool.query(sqlInsert, [
          id,
          categoryId,
          productName,
          qty,
          unit,
          product_id,
        ]);
      }
    }

    //บันทึก Customer List

    // ลบข้อมูลเก่าก่อน
    const sqlDeleteOldCustomer = `DELETE FROM auction_customer_list WHERE auction_id = ?`;
    await pool.query(sqlDeleteOldCustomer, [id]);

    for (const cus of customers) {
      const customer_id = cus.customer_id;
      const price = cus.price;

      const sql = `INSERT INTO auction_customer_list (auction_id, customer_id, price) VALUES (?, ?, ?)`;
      await pool.query(sql, [id, customer_id, price]);
    }

    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const clearAuctionRoom = async (req, res) => {
  const { id } = req.body;
  let pool = await db.getConnection();
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // ก่อนลบ เช็คก่อนว่า จบประมูลหรือยัง

    // หา ID ของ Auction_title
    const sqlSearchId = `SELECT id, auction_id, status FROM auction WHERE id = ?`;
    const [resultSearchId] = await pool.query(sqlSearchId, [id]);
    const auction_id = resultSearchId[0].auction_id;
    const status = resultSearchId[0].status;
    let changeState = status === 0 ? 0 : 1;

    if (status === 0) {
      // ลบ auction_product_list
      const sqlDeleteOld = `DELETE FROM auction_product_list WHERE auction_id = ?`;
      await pool.query(sqlDeleteOld, [id]);

      // ลบ auction_customer_list
      const sqlDeleteOldCustomer = `DELETE FROM auction_customer_list WHERE auction_id = ?`;
      await pool.query(sqlDeleteOldCustomer, [id]);

      const sql = `DELETE FROM auction  WHERE id = ?`;
      await pool.query(sql, [id]);
    }

    // Update auction_title
    const sqlUpdate = `UPDATE auction_title SET status = ? WHERE id = ?`;
    const [resultUpdate] = await pool.query(sqlUpdate, [
      changeState,
      auction_id,
    ]);

    return res.status(200).json({ message: "ทำรายการสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const addWinner = async (req, res) => {
  const { id } = req.body;
  let pool = await db.getConnection();
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // หาจำนวนเงินมากที่สุด
    const sqlMaxPrice = `SELECT price, customer_id , customer.name
    FROM auction_customer_list 
    LEFT JOIN customer ON auction_customer_list.customer_id = customer.id
    WHERE auction_id = ? ORDER BY price DESC LIMIT 1 `;
    const [resultMaxPrice] = await pool.query(sqlMaxPrice, [id]);
    const maxPrice = resultMaxPrice[0]?.price || 0;
    const customer_id = resultMaxPrice[0]?.customer_id || "";
    const customer_name = resultMaxPrice[0]?.name
    

    if (!customer_id)
      return res.status(400).json({ message: "ไม่พบผู้ชนะประมูล" });

    const sql = `UPDATE auction SET price = ? , customer_id = ?, customer_name = ? , status = ? WHERE id = ?`;
    await pool.query(sql, [maxPrice, customer_id, customer_name, 1, id]);

    // ค้นหา code ล่าสุดในปีนี้
    const [rows] = await pool.query(
      `SELECT code FROM auction ORDER BY code DESC LIMIT 1`
    );
    const lastCode = rows[0]?.code || "";
    const newCode = await genCode(lastCode, "BI");

    // เช็คว่า id นี้มี code บิล หรือยัง
    const sqlCheckCode = `SELECT code FROM auction WHERE id = ? LIMIT 1`;
    const [resultCheckCode] = await pool.query(sqlCheckCode, [id]);
    const myCode = resultCheckCode[0].code || "";
    if (myCode === "") {
      const sql = `UPDATE auction SET code = ?  WHERE id = ?`;
      await pool.query(sql, [newCode, id]);
    }

    return res.status(200).json({ message: "ทำรายการสำเร็จ" });


  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const showWinner = async (req, res) => {
  const { id } = req.body;
  let pool = await db.getConnection();
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    // Main
    const sql = `
    SELECT   auction.id,  auction_title.name AS title , auction.government , auction.lottery , auction.price, customer.name AS name
    FROM auction
    INNER JOIN auction_title ON auction.auction_id = auction_title.id
    INNER JOIN customer ON auction.customer_id = customer.id
    WHERE auction.id = ? AND auction.status = ? GROUP BY auction.id, auction_title.name, customer.name;
    `;
    const [resultSql] = await pool.query(sql, [id, 1]);

    // products
    const sqlProducts = `
    SELECT product.name AS name, product.unit,  auction_product_list.qty 
    FROM auction_product_list
    INNER JOIN product ON auction_product_list.product_id = product.id
    WHERE auction_product_list.auction_id = ?
    `;
    const [resultProducts] = await pool.query(sqlProducts, [id]);

    const newDataProduct = [
      `สลากออมสิน ${resultSql[0]?.government || 0} ใบ `,
      `ล็อตเตอรี่ ${resultSql[0]?.lottery || 0} ใบ `,
      ...resultProducts.map((item) => `${item.name} ${item.qty} ${item.unit}`),
    ].join(" / ");

    const data = {
      results: resultSql[0],
      products: newDataProduct,
    };

    if (resultSql.length <= 0)
      return res.status(200).json({
        results: [],
        products: "",
      });

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const saveImageWinner = async (req, res) => {
  let pool = await db.getConnection();
  try {
    const { image, id } = req.body;

    if (!image || !id) {
      return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });
    }
    // ตรวจสอบว่ามีการบันทึกภาพแล้วหรือยัง
    const checkSql = `SELECT images FROM auction WHERE id = ?`;
    const [rows] = await pool.query(checkSql, [id]);

    let oldImagePath = null;

    if (rows.length > 0 && rows[0].images) {
      oldImagePath = path.join(__dirname, "../uploads", rows[0].images);
      console.log("พบรูปภาพเก่าที่ต้องลบ:", oldImagePath);
    }

    const uploadsDir = path.join(__dirname, "../uploads");

    // ตรวจสอบว่ามีโฟลเดอร์อยู่หรือไม่
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("Uploads directory created.");
    }

    // แปลง Base64 เป็น Buffer
    const buffer = Buffer.from(image.split(",")[1], "base64");

    const newName = `image-${Date.now()}.png`;
    const filePath = path.join(uploadsDir, newName);
    fs.writeFileSync(filePath, buffer);

    // ลบรูปภาพเก่า (ถ้ามี)
    if (oldImagePath && fs.existsSync(oldImagePath)) {
      fs.unlinkSync(oldImagePath);
      console.log("ลบรูปภาพเก่าเรียบร้อยแล้ว:", oldImagePath);
    }

    // บันทึก
    const sql = `UPDATE auction SET images = ? WHERE id = ?`;
    await pool.query(sql, [newName, id]);

    res.status(200).json({ message: "Image uploaded successfully" });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: "Error uploading image" });
  } finally {
    if (pool) pool.release();
  }
};

export const updatePay = async (req, res) => {
  let pool = await db.getConnection();
  const { id } = req.body;
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    const sql = `UPDATE auction SET status = ? WHERE id = ?`;
    await pool.query(sql, [2, id]);
    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};


// หน้ารายงาน ส่วนใหญ่
export const putAuctionById = async (req, res) => {
  const {
    id,
    government,
    lottery,
    price,
    ref,
    note,
    auction_title_id,
    customer_id,
    customer_name,
    products,
  } = req.body;
  let pool = await db.getConnection();
  
  console.log(req.body);
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    
    const sqlUpdateAuction = `UPDATE auction SET government = ?, lottery = ?, price = ?,  note = ?, auction_id = ?, customer_id = ?, customer_name = ? WHERE id = ? `;
    await pool.query(sqlUpdateAuction, [
      government,
      lottery,
      price,
      note,
      auction_title_id,
      customer_id,
      customer_name,
      id,
    ]);

    const sqlUpdateAuctionTitle = `UPDATE customer SET ref = ? WHERE id = ? `
    await pool.query(sqlUpdateAuctionTitle, [ref, customer_id])



    // ลบรายการเดิมก่อน products List
    const sqlDeleteAuctionProductList = `DELETE FROM auction_product_list WHERE auction_id = ?`;
    await pool.query(sqlDeleteAuctionProductList, [id]);

    // ลบรายการเดิมก่อน customer List
    const sqlDeleteAuctionCustomerList = `DELETE FROM auction_customer_list WHERE auction_id = ?`;
    await pool.query(sqlDeleteAuctionCustomerList, [id]);

    for (const item of products) {
      const category_id = item.category_id;
      for (const itemList of item.results) {
        const sql = `INSERT INTO auction_product_list (auction_id, category_id, product_name, qty, product_id  ) VALUES (?, ?, ?, ?, ?)`;
        await pool.query(sql, [
          id,
          category_id,
          itemList.name,
          itemList.quantity,
          itemList.product_id,
        ]);
      }
    }
    

    console.log({customer_id});
    
    const sqlAddCustomerLits = `INSERT INTO auction_customer_list (auction_id, customer_id, price  ) VALUES (?, ?, ?)`
    await pool.query(sqlAddCustomerLits, [id, customer_id, price ])
    
    return res.status(200).json({message : 'บันทึกสำเร็จ'})

  } catch (error) {
    console.log(error);
    return res.status(200).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const cacelBillAuction = async(req,res)=> {
  const {id} = req.body
  let pool = await db.getConnection()
  try {
    if(!id) return res.status(400).json({message : 'ส่งข้อมูลไม่ครบ'})

      const sql = `UPDATE auction SET status = ? WHERE id = ?`
      await pool.query(sql, [3, id])
      return res.status(200).json({message : 'ทำรายการสำเร็จ'})
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message)
    
  }finally {
    if(pool) pool.release()
  }
}

export const exportToExcel = async (req, res) => {

    
  const { startDate, endDate, search } = req.query;
  console.log(req.query);
  
  let pool = await db.getConnection();
  try {
    let sql = `SELECT  
      code, price, government, lottery, customer_name, note,
      DATE_FORMAT(date, '%d/%m/%Y') as date
      FROM auction `;

    let whereConditions = [];
    let params = [];

    if (startDate && endDate) {
      whereConditions.push(` date BETWEEN ? AND ? `);
      params.push(startDate, endDate);
    }
    if (search) {
      whereConditions.push(` code LIKE ? `);
      params.push(`%${search}%`);
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
      { header: "สลากออมสิน", key: "government", width: 10 },
      { header: "ล็อตเตอรี่", key: "lottery", width: 10 },
      { header: "ผู้บริจาค", key: "customer_name", width: 10 },
      { header: "ราคา", key: "price", width: 10 },
      { header: "วันที่", key: "date", width: 10 },
      { header: "หมายเหตุ", key: "note", width: 10 },

    ];

    // เพิ่มข้อมูล
    result.forEach((row) => {
      worksheet.addRow(row);
    });

    // กำหนดชื่อไฟล์
    const fileName = `Auction_${startDate || "all"}_${
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

