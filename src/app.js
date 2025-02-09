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
import saleRouter from './routes/sale.js'
import debtorRouter from './routes/debtor.js'
import reportRouter from './routes/report.js'
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
app.use('/api/sale', saleRouter)
app.use('/api/debtor', debtorRouter)
app.use('/api/report', reportRouter)


  

  export default app;