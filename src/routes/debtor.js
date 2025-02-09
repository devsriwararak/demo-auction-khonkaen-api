import express from 'express'
import { authenticationToken } from '../config/middleware.js'
import { exportToExcel, getAllDebtor } from '../controllers/debtor.js'
const router = express.Router()

router.post('/all', authenticationToken, getAllDebtor)
router.get('/send/excel', authenticationToken , exportToExcel)






export default router