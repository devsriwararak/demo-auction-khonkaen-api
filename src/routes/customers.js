import express from 'express'
import { getAllCustomer } from '../controllers/customers.js'
const router = express.Router()

router.get('/', getAllCustomer)


export default router