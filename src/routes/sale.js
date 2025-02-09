import express from 'express'
import { authenticationToken } from '../config/middleware.js'
import { addNewData, cacelBillAuction, exportToExcel, getAllSale, getDataById, getDataSaleListById, updatePay } from '../controllers/sale.js'
const router = express.Router()

router.post('/add', authenticationToken, addNewData)
router.post('/all', authenticationToken, getAllSale)
router.get('/all/:id', authenticationToken, getDataById)
router.get('/:id', authenticationToken, getDataSaleListById)
router.post('/add_pay', authenticationToken, updatePay)
router.post('/cancel', authenticationToken, cacelBillAuction)
router.get('/send/excel', authenticationToken , exportToExcel)







export default router