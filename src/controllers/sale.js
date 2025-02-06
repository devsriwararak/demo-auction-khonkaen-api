import db from "../config/db.js";
import { genCode } from "../config/lib.js";

export const addNewData = async (req, res) => {
  const {
    id,
    government,
    lottery,
    products,
    customer_id,
    customer_name,
    price,
    date,
    note,
  } = req.body;
  let pool = await db.getConnection();
//   console.log(req.body);

  try {
    let sqlUpdate = "";
    let paramsUpdate = [];

    if (!id) {
      // ค้นหา code ล่าสุดในปีนี้
      const [rows] = await pool.query(
        `SELECT code FROM sale ORDER BY code DESC LIMIT 1`
      );
      const lastCode = rows[0]?.code || "";
      const newCode = await genCode(lastCode, "DO");

      sqlUpdate =
        "INSERT INTO sale (code, government, lottery, customer_id, customer_name, price, date, note, status ) VALUE (?,?,?,?,?,?,?,?,?)";
      paramsUpdate.push(
        newCode,
        government,
        lottery,
        customer_id,
        customer_name,
        price,
        date,
        note,
        1
      );
    } else {
      sqlUpdate =
        "UPDATE sale SET government = ?, lottery = ?, customer_id = ?, customer_name = ?, price = ?, date = ?, note = ?  WHERE id = ?";
      paramsUpdate.push(
        government,
        lottery,
        customer_id,
        customer_name,
        price,
        date,
        note,
        id
      );
    }

    const [result] = await pool.query(sqlUpdate, paramsUpdate);

    if (!id && !result.insertId)
    return res.status(400).json({ message: "บันทึกผิดพลาด" });
    const sale_id = result.insertId || id;

    // ถ้ามี ID มา ลบข้อมูลเก่าก่อน
    if(id){
    const sqlDeleteOld = `DELETE FROM sale_product_list WHERE sale_id = ?`;
    await pool.query(sqlDeleteOld, [sale_id]);
    }


    // 4) Loop Insert สินค้าใหม่
    for (const cat of products) {
      const categoryId = cat.category_id;

      for (const item of cat.results) {
        const productName = item.name;
        const qty = item.quantity;
        const price = item.price || 0;
        const total = item.total || 0
        const product_id = item.product_id;
        const unit = item.unit;
        

        // Insert ลงตาราง
        const sqlInsert = `
              INSERT INTO sale_product_list
              (sale_id, category_id, product_name, qty, unit, price, total, product_id)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `;
        await pool.query(sqlInsert, [
          sale_id,
          categoryId,
          productName,
          qty,
          unit,
          price,
          total,
          product_id,
        ]);
      }
    }

    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const getAllSale = async (req, res) => {
  let pool = await db.getConnection();

  try {
    const { search, startDate, endDate } = req.body;

    // pagination
    const limit = 10;
    const { page = 1 } = req.body;
    const offset = (page - 1) * limit;

    // SQL Total Page
    let countSql = `SELECT COUNT(*) as totalCount FROM sale `;
    let countParams = [];

    // SQL main Page
    let sql = `
      SELECT sale.id, sale.code, sale.customer_name AS name ,
      DATE_FORMAT(sale.date, '%d/%m/%Y') as date ,
      sale.price , sale.status 
      FROM sale 
      `;

    let whereConditions = [];
    let params = [];

    if (startDate && endDate) {
      whereConditions.push(` sale.date BETWEEN ? AND ? `);
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
    sql += ` ORDER BY sale.id DESC LIMIT ? OFFSET ? `;
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
        SELECT sale.id, sale.code, sale.note, sale.customer_id, 
        sale.customer_name AS name, customer.noun, customer.ref, customer.tel, customer.address_customer, customer.address_send, customer.contact,
        DATE_FORMAT(sale.date, '%d/%m/%Y') as date ,
        sale.price , sale.status ,
        government, lottery
        FROM sale 
        LEFT JOIN customer ON sale.customer_id = customer.id
        WHERE sale.id = ?
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

export const getDataSaleListById = async (req, res) => {
  let pool = await db.getConnection();
  const { id } = req.params;

  try {
    const sql = `SELECT id, government, lottery FROM sale WHERE id = ?  `;
    const [result] = await pool.query(sql, [id]);
    const { government, lottery } = result[0] || 0;

    // Products
    const sqlList = `SELECT sale_product_list.id, sale_product_list.category_id, product_name, qty , category.name as category_name , 
      sale_product_list.product_id as product_id, sale_product_list.price, sale_product_list.total,
      product.unit
      FROM sale_product_list 
      INNER JOIN category ON sale_product_list.category_id = category.id
      INNER JOIN product ON sale_product_list.product_id = product.id
      WHERE sale_id = ?`;
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
        price : p.price,
        total: p.total
      }));

      return {
        category_id: catId,
        results,
      };
    });

    // Customer Data
    //   const sqlCustomerList = `SELECT auction_customer_list.id , customer.name AS customer_name, customer.id AS customer_id , auction_customer_list.price
    //   FROM auction_customer_list
    //   INNER JOIN customer ON auction_customer_list.customer_id = customer.id
    //    WHERE auction_id = ?
    //    ORDER BY auction_customer_list.price DESC LIMIT 3
    //    `;
    //   const [resultCustomerList] = await pool.query(sqlCustomerList, [id]);

    //   const customerData = resultCustomerList.map((item) => {
    //     const data = {
    //       customer_id: item.customer_id,
    //       customer_name: item.customer_name,
    //       price: item.price,
    //     };
    //     return data;
    //   });

    // รวมเป็น object ตามที่ต้องการ
    const data = {
      id,
      government,
      lottery,
      products,
      // customers: customerData,
    };

    return res.status(200).json(data);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const updatePay = async (req, res) => {
  let pool = await db.getConnection();
  const { id } = req.body;
  try {
    if (!id) return res.status(400).json({ message: "ส่งข้อมูลไม่ครบ" });

    const sql = `UPDATE sale SET status = ? WHERE id = ?`;
    await pool.query(sql, [2, id]);
    return res.status(200).json({ message: "บันทึกสำเร็จ" });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message);
  } finally {
    if (pool) pool.release();
  }
};

export const cacelBillAuction = async(req,res)=> {
  const {id} = req.body
  let pool = await db.getConnection()
  try {
    if(!id) return res.status(400).json({message : 'ส่งข้อมูลไม่ครบ'})

      const sql = `UPDATE sale SET status = ? WHERE id = ?`
      await pool.query(sql, [3, id])
      return res.status(200).json({message : 'ทำรายการสำเร็จ'})
  } catch (error) {
    console.log(error);
    return res.status(500).json(error.message)
    
  }finally {
    if(pool) pool.release()
  }
}


