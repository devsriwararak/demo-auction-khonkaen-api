import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import customerRouter from './routes/customers.js'


const app = express()

// Middleware
app.use(cors())
app.use(bodyParser.json())

// Routes
app.use('/api/customer', customerRouter)


export default app