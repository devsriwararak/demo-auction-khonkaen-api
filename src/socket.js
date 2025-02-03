<<<<<<< HEAD
import { Server } from "socket.io";
import db from "./config/db.js";

async function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // ปรับให้ตรงกับ domain ของคุณใน production
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ดึงข้อมูลจากตาราง customer
    socket.on("getTableCustomer", async () => {
      try {
        const pool = await db.getConnection();
        const sql = `SELECT * FROM customer`;
        const [results] = await pool.query(sql);

        // ส่งข้อมูลกลับไปยัง Client
        socket.emit("customerDataReady", results);
        pool.release();
      } catch (error) {
        console.error("Error fetching customer data:", error);
        // socket.emit("customerData", []);
      }
    });

    // ดึงข้อมูลจากตาราง product
    socket.on("getTableProduct", async () => {
      try {
        const pool = await db.getConnection();
        const sql = `SELECT * FROM product`;
        const [results] = await pool.query(sql);

        // ส่งข้อมูลกลับไปยัง Client
        socket.emit("productData", results);
        pool.release();
      } catch (error) {
        console.error("Error fetching product data:", error);
        socket.emit("productData", []);
      }
    });

    // ขั้นตอนที่ 1 กดเลือกหัวข้อ
    socket.on("step_1", async (id) => {
      try {
        const results = await showauctionTitleStart(id);
        io.emit("show_step_1", results);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_step_1", ""); // ส่งข้อมูลว่างในกรณีเกิดข้อผิดพลาด
      }
    });

    // ขั้นตอนที่ 2 กดบันทึกข้อมูล
    socket.on("step_2", async (id) => {
      try { 
        const results = await handleSave(id);
        console.log(results);
        
        // socket.broadcast.emit("show_step_2", results)
        io.emit("show_step_2", results);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_step_2", "|"); // ส่งข้อมูลว่างในกรณีเกิดข้อผิดพลาด
      }
    });

    // สัปเปลี่ยนหน้าจอ
    socket.on("change_screen", async(data)=> {
      try {
        io.emit("show_change_screen", data);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_display_screen", "|");
      }
    })

    // แคปหน้าจอ
    socket.on("capture_screen", async(data)=> {
      io.emit('show_capture_screen', data)
    })

    // รีโหลดจอ
    socket.on("reload_screen", async(data)=> {
      try {
        io.emit("show_reload_screen", data);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_reload_screen", 0);
      }
    })

    // กดเลข 1 2 3 
    socket.on("change_number_count", async(data)=> {
      try {
        io.emit("show_change_number_count", data);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_change_number_count", 1);
      }
    })


    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

// Start โชว์หัวข้อประมูล
const showauctionTitleStart = async (id) => {
  let pool = await db.getConnection();
  try {
    const sql = `
    SELECT auction_title.name as name
    FROM auction
    INNER JOIN auction_title ON auction.auction_id = auction_title.id
    WHERE auction.id = ?
    `;
    const [result] = await pool.query(sql, [id]);
    return result[0].name;
  } catch (error) {
    console.log(error);
  } finally {
    if (pool) pool.release();
  }
};

// หลังจากกด บันทึก
const handleSave = async (id) => {
  let pool = await db.getConnection();
  try {
    // Main Data
    const sqlMain = `SELECT id,government, lottery FROM auction WHERE id = ?`
    const [resultMain] = await pool.query(sqlMain,[id])

    const auction_id = resultMain[0].id
    const government = resultMain[0].government || 0
    const lottery = resultMain[0].lottery || 0

    // ข้อมูล Products
    const sqlProducts = `
    SELECT product_name, qty ,product.unit as unit
    FROM  auction_product_list 
    INNER JOIN product ON auction_product_list.product_id = product.id
    WHERE auction_product_list.auction_id = ?
    `
    const [resultProducts] = await pool.query(sqlProducts, [auction_id])

    // ข้อมูล Customers
    const sqlCustomer = `
    SELECT customer.name as name , auction_customer_list.price as price
    FROM auction_customer_list
    INNER JOIN customer ON auction_customer_list.customer_id = customer.id
    WHERE auction_customer_list.auction_id = ?
    ORDER BY auction_customer_list.price DESC LIMIT 3
    `
    const [resultCustomers] = await pool.query(sqlCustomer, [auction_id])

    // ดึงหัวข้อมา
    const title = await showauctionTitleStart(id)

    const data = {
      id : auction_id,
      title ,
      government ,
      lottery,
      products : resultProducts , 
      customers : resultCustomers
    }

    return data

    
    

  } catch (error) {
    console.log(error);
  } finally {
    if (pool) pool.release();
  }
};

export default setupSocket;
=======
import { Server } from "socket.io";
import db from "./config/db.js";

async function setupSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: "*", // ปรับให้ตรงกับ domain ของคุณใน production
    },
  });

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ดึงข้อมูลจากตาราง customer
    socket.on("getTableCustomer", async () => {
      try {
        const pool = await db.getConnection();
        const sql = `SELECT * FROM customer`;
        const [results] = await pool.query(sql);

        // ส่งข้อมูลกลับไปยัง Client
        socket.emit("customerDataReady", results);
        pool.release();
      } catch (error) {
        console.error("Error fetching customer data:", error);
        // socket.emit("customerData", []);
      }
    });

    // ดึงข้อมูลจากตาราง product
    socket.on("getTableProduct", async () => {
      try {
        const pool = await db.getConnection();
        const sql = `SELECT * FROM product`;
        const [results] = await pool.query(sql);

        // ส่งข้อมูลกลับไปยัง Client
        socket.emit("productData", results);
        pool.release();
      } catch (error) {
        console.error("Error fetching product data:", error);
        socket.emit("productData", []);
      }
    });

    // ขั้นตอนที่ 1 กดเลือกหัวข้อ
    socket.on("step_1", async (id) => {
      try {
        const results = await showauctionTitleStart(id);
        io.emit("show_step_1", results);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_step_1", ""); // ส่งข้อมูลว่างในกรณีเกิดข้อผิดพลาด
      }
    });

    // ขั้นตอนที่ 2 กดบันทึกข้อมูล
    socket.on("step_2", async (id) => {
      try { 
        const results = await handleSave(id);
        console.log(results);
        
        // socket.broadcast.emit("show_step_2", results)
        io.emit("show_step_2", results);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_step_2", "|"); // ส่งข้อมูลว่างในกรณีเกิดข้อผิดพลาด
      }
    });

    // สัปเปลี่ยนหน้าจอ
    socket.on("change_screen", async(data)=> {
      try {
        io.emit("show_change_screen", data);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_display_screen", "|");
      }
    })

    // แคปหน้าจอ
    socket.on("capture_screen", async(data)=> {
      io.emit('show_capture_screen', data)
    })

    // รีโหลดจอ
    socket.on("reload_screen", async(data)=> {
      try {
        io.emit("show_reload_screen", data);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_reload_screen", 0);
      }
    })

    // กดเลข 1 2 3 
    socket.on("change_number_count", async(data)=> {
      try {
        io.emit("show_change_number_count", data);
      } catch (error) {
        console.error("Error fetching customer data:", error);
        io.emit("show_change_number_count", 1);
      }
    })


    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);
    });
  });

  return io;
}

// Start โชว์หัวข้อประมูล
const showauctionTitleStart = async (id) => {
  let pool = await db.getConnection();
  try {
    const sql = `
    SELECT auction_title.name as name
    FROM auction
    INNER JOIN auction_title ON auction.auction_id = auction_title.id
    WHERE auction.id = ?
    `;
    const [result] = await pool.query(sql, [id]);
    return result[0].name;
  } catch (error) {
    console.log(error);
  } finally {
    if (pool) pool.release();
  }
};

// หลังจากกด บันทึก
const handleSave = async (id) => {
  let pool = await db.getConnection();
  try {
    // Main Data
    const sqlMain = `SELECT id,government, lottery FROM auction WHERE id = ?`
    const [resultMain] = await pool.query(sqlMain,[id])

    const auction_id = resultMain[0].id
    const government = resultMain[0].government || 0
    const lottery = resultMain[0].lottery || 0

    // ข้อมูล Products
    const sqlProducts = `
    SELECT product_name, qty ,product.unit as unit
    FROM  auction_product_list 
    INNER JOIN product ON auction_product_list.product_id = product.id
    WHERE auction_product_list.auction_id = ?
    `
    const [resultProducts] = await pool.query(sqlProducts, [auction_id])

    // ข้อมูล Customers
    const sqlCustomer = `
    SELECT customer.name as name , auction_customer_list.price as price
    FROM auction_customer_list
    INNER JOIN customer ON auction_customer_list.customer_id = customer.id
    WHERE auction_customer_list.auction_id = ?
    ORDER BY auction_customer_list.price DESC LIMIT 3
    `
    const [resultCustomers] = await pool.query(sqlCustomer, [auction_id])

    // ดึงหัวข้อมา
    const title = await showauctionTitleStart(id)

    const data = {
      id : auction_id,
      title ,
      government ,
      lottery,
      products : resultProducts , 
      customers : resultCustomers
    }

    return data

    
    

  } catch (error) {
    console.log(error);
  } finally {
    if (pool) pool.release();
  }
};

export default setupSocket;
>>>>>>> cd9e817317f80d1d7d35d8dd117121576314e6af
