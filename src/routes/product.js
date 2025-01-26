import express from 'express'
import { authenticationToken } from '../config/middleware.js'
import { addNew, deleteById, exportToExcel, getAll, getAllCategory, getById } from '../controllers/product.js'
const rounter = express.Router()

rounter.get('/category/all', authenticationToken, getAllCategory)
rounter.post('/all', authenticationToken, getAll)
rounter.post('/add', authenticationToken, addNew)
rounter.get('/:id',  authenticationToken, getById)
rounter.delete('/:id',  authenticationToken, deleteById)
rounter.get('/send/excel', authenticationToken , exportToExcel)




export default rounter