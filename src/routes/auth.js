import express from 'express'
import { getAllUsers, getUserById, login, logout, register, updateUserById } from '../controllers/auth.js'
import { authenticationToken } from '../config/middleware.js'
const router = express.Router()

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.get('/users', authenticationToken, getAllUsers)
router.get('/users/:id', authenticationToken, getUserById)
router.post('/users/update', authenticationToken, updateUserById)

export default router