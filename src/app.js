<<<<<<< HEAD
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from "path";



// Components
import authRouter from './routes/auth.js'
import auctionTitleRouter from './routes/auction_title.js'
import customerRouter from './routes/customer.js'
import productRouter from './routes/product.js'
import auctionRouter from './routes/auction.js'
import { fileURLToPath } from 'url';


const app = express()

// Middleware
app.use(cors())
app.use(bodyParser.json({ limit: "10mb" }))

// static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use('/api/customer', customerRouter)
app.use('/api/auth', authRouter)
app.use('/api/auction_title', auctionTitleRouter)
app.use('/api/product', productRouter)
app.use('/api/auction', auctionRouter)


  
=======
import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import path from "path";



// Components
import authRouter from './routes/auth.js'
import auctionTitleRouter from './routes/auction_title.js'
import customerRouter from './routes/customer.js'
import productRouter from './routes/product.js'
import auctionRouter from './routes/auction.js'
import { fileURLToPath } from 'url';


const app = express()

// Middleware
app.use(cors())
app.use(bodyParser.json({ limit: "10mb" }))

// static
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use('/api/customer', customerRouter)
app.use('/api/auth', authRouter)
app.use('/api/auction_title', auctionTitleRouter)
app.use('/api/product', productRouter)
app.use('/api/auction', auctionRouter)




// Routes ตัวอย่าง (คุณมี API ของคุณเอง)
// API เพื่อเริ่ม Socket.IO
// app.post("/api/socket/start", (req, res) => {
//     console.log("API: Start socket requested");
  
//     const server = req.app.get("server");
//     if (!server) return res.status(500).json({ error: "Server not found" });
  
//     const io = initializeSocket(server);
//     if (io) {
//       console.log("API: Socket server started.");
//       return res.status(200).json({ message: "Socket server started" });
//     }
  
//     res.status(500).json({ error: "Socket server failed to start" });
//   });
  
//   // API เพื่ออัปเดตข้อมูล
//   app.post("/api/socket/update", (req, res) => {
//     const { newData } = req.body;
//     if (!newData)
//       return res.status(400).json({ error: "No data provided for update" });
  
//     updateAuctionData(newData);
//     res.status(200).json({ message: "Auction data updated", data: getAuctionData() });
//   });
  
>>>>>>> cd9e817317f80d1d7d35d8dd117121576314e6af
  export default app;