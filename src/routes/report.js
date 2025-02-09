import express  from 'express'
import { authenticationToken } from '../config/middleware.js'
import { exportToExcel, reportListAll, reportLogin, sumAll } from '../controllers/report.js'
const router = express.Router()

router.post('/all', authenticationToken, sumAll)
router.post('/list/all', authenticationToken, reportListAll)
router.post('/login', authenticationToken, reportLogin)
router.get('/product/send/excel', authenticationToken , exportToExcel)


export default router