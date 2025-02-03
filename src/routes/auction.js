import express from 'express'
import { authenticationToken } from '../config/middleware.js'
import { addWinner, adminAddData, cacelBillAuction, clearAuctionRoom, exportToExcel, getAllAction, getAuctionTitleForNowDay, getDataById, getDataProductListById, putAuctionById, saveImageWinner, showWinner, startAuction, updatePay } from '../controllers/auction.js'
const router = express.Router()

router.get('/title', authenticationToken, getAuctionTitleForNowDay)
router.post('/start', authenticationToken, startAuction)
router.post('/all', authenticationToken, getAllAction)
router.get('/all/:id', authenticationToken, getDataById)
router.post('/add', authenticationToken, adminAddData)
router.get('/:id', authenticationToken, getDataProductListById)
router.post('/clear', authenticationToken, clearAuctionRoom)
router.post('/add_winner', authenticationToken, addWinner)
router.post('/add_pay', authenticationToken, updatePay)
router.post('/update', authenticationToken, putAuctionById)
router.post('/cancel', authenticationToken, cacelBillAuction)
router.get('/send/excel', authenticationToken , exportToExcel)


// Displays
router.post('/winner', showWinner)
router.post('/save_image', saveImageWinner)


export default router