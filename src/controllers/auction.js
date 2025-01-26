import moment from "moment";
import db from "../config/db.js";
const dateNow = moment().format("YYYY-MM-DD");

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

export const getDataById = async (req, res) => {
  let pool = await db.getConnection();
  const { id } = req.params;

  try {
    const sql = `SELECT id, government, lottery FROM auction WHERE id = ?  `;
    const [result] = await pool.query(sql, [id]);
    const { id: auctionId, government, lottery } = result[0];

    // Products
    const sqlList = `SELECT auction_product_list.id, category_id, product_name, qty , category.name as category_name , auction_product_list.product_id as product_id
    FROM auction_product_list 
    INNER JOIN category ON auction_product_list.category_id = category.id
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
      id: auctionId,
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
      "test",
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

        // Insert ลงตาราง
        const sqlInsert = `
            INSERT INTO auction_product_list
            (auction_id, category_id, product_name, qty, product_id)
            VALUES (?, ?, ?, ?, ?)
          `;
        await pool.query(sqlInsert, [
          id,
          categoryId,
          productName,
          qty,
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
    let changeState = status === 0 ? 0 : 1

    if (status === 0) {
      // ลบ auction_product_list
      const sqlDeleteOld = `DELETE FROM auction_product_list WHERE auction_id = ?`;
      await pool.query(sqlDeleteOld, [id]);

      // ลบ auction_customer_list
      const sqlDeleteOldCustomer = `DELETE FROM auction_customer_list WHERE auction_id = ?`;
      await pool.query(sqlDeleteOldCustomer, [id]);

      const sql = `DELETE FROM auction  WHERE id = ?`;
      await pool.query(sql, [ id]);
      
    }

    // Update auction_title
    const sqlUpdate = `UPDATE auction_title SET status = ? WHERE id = ?`;
    const [resultUpdate] = await pool.query(sqlUpdate, [changeState, auction_id]);

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

    console.log(id);
    // หาจำนวนเงินมากที่สุด
    const sqlMaxPrice = `SELECT price, customer_id FROM auction_customer_list WHERE auction_id = ? ORDER BY price DESC LIMIT 1 `;
    const [resultMaxPrice] = await pool.query(sqlMaxPrice, [id]);
    const maxPrice = resultMaxPrice[0].price || 0;
    const customer_id = resultMaxPrice[0].customer_id || "";

    const sql = `UPDATE auction SET price = ? , customer_id = ?, status = ? WHERE id = ?`;
    await pool.query(sql, [maxPrice, customer_id, 1, id]);
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

    if(resultSql.length <= 0) return res.status(200).json({
      results:[],
      products: "",
    })

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};
