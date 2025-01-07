import express from 'express'
import { getAllCustomer } from '../controllers/customers.js'
import { authenticationToken } from '../config/middleware.js'
const router = express.Router()

router.get('/', authenticationToken, getAllCustomer)


export default router