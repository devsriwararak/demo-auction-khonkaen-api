import express from 'express'
import { authenticationToken } from '../config/middleware.js'
import { addWinner, adminAddData, clearAuctionRoom, getAuctionTitleForNowDay, getDataById, showWinner, startAuction } from '../controllers/auction.js'
const router = express.Router()

router.get('/title', authenticationToken, getAuctionTitleForNowDay)
router.post('/start', authenticationToken, startAuction)
router.post('/add', authenticationToken, adminAddData)
router.get('/:id', authenticationToken, getDataById)
router.post('/clear', authenticationToken, clearAuctionRoom)
router.post('/add_winner', authenticationToken, addWinner)
router.post('/winner', showWinner)


export default router