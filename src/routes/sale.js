import express from 'express'
import { authenticationToken } from '../config/middleware.js'
import { addNewData, getAllSale, getDataById, getDataSaleListById } from '../controllers/sale.js'
const router = express.Router()

router.post('/add', authenticationToken, addNewData)
router.post('/all', authenticationToken, getAllSale)
router.get('/all/:id', authenticationToken, getDataById)
router.get('/:id', authenticationToken, getDataSaleListById)



export default router