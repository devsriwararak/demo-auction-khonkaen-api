import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'

// Components
import customerRouter from './routes/customers.js'
import authRouter from './routes/auth.js'
import auctionTitleRouter from './routes/auction_title.js'


const app = express()

// Middleware
app.use(cors())
app.use(bodyParser.json())

// Routes
app.use('/api/customer', customerRouter)
app.use('/api/auth', authRouter)
app.use('/api/auction_title', auctionTitleRouter)


export default app