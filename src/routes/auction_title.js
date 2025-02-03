import express from 'express'
import { authenticationToken } from '../config/middleware.js'
import { addNew, deleteById, exportToExcel, getAll, getById } from '../controllers/auction_title.js'
const router = express.Router()

router.post('/all', authenticationToken, getAll)
router.post('/add', authenticationToken, addNew)
router.get('/:id',  authenticationToken, getById)
router.delete('/:id',  authenticationToken, deleteById)
router.get('/send/excel', authenticationToken , exportToExcel)

export default router