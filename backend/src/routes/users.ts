import express from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  updateUserPassword,
  getUserByUsername,
} from '../database/queries.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { hashPassword } from '../utils/auth.js';

const router = express.Router();

/**
 * GET /api/users
 * Get all users
 * ตามเอกสาร: 07-data-model-api-design.md#users
 * Access: Super User only
 * Use Case: UC09 - Manage Users
 */
router.get('/', authenticateToken, requireRole('SUPER_USER'), async (req, res) => {
  try {
    const users = await getAllUsers();
    
    // ไม่ส่ง password_hash กลับไป
    const sanitizedUsers = users.map(user => {
      const { password_hash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    res.json({
      success: true,
      data: sanitizedUsers,
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users',
    });
  }
});

/**
 * GET /api/users/:id
 * Get user by ID
 * ตามเอกสาร: 07-data-model-api-design.md#users
 * Access: Super User only
 */
router.get('/:id', authenticateToken, requireRole('SUPER_USER'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }
    
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // ไม่ส่ง password_hash กลับไป
    const { password_hash, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user',
    });
  }
});

/**
 * POST /api/users
 * Create new user
 * ตามเอกสาร: 07-data-model-api-design.md#users
 * Access: Super User only
 * 
 * Request Body:
 * {
 *   "username": "string",
 *   "password": "string",
 *   "email": "string",
 *   "role_id": number
 * }
 */
router.post('/', authenticateToken, requireRole('SUPER_USER'), async (req, res) => {
  try {
    const { username, password, email, role_id } = req.body;
    
    // Validation
    if (!username || !password || !email || !role_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: username, password, email, role_id',
      });
    }
    
    // ตรวจสอบว่า username ซ้ำหรือไม่
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists',
      });
    }
    
    // Hash password ตามหลัก Security (06-erd-database-design.md)
    const passwordHash = await hashPassword(password);
    
    // สร้าง user ใหม่
    const newUser = await createUser(username, passwordHash, email, role_id);
    
    // ไม่ส่ง password_hash กลับไป
    const { password_hash: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user',
    });
  }
});

/**
 * PUT /api/users/:id
 * Update user
 * ตามเอกสาร: 07-data-model-api-design.md#users
 * Access: Super User only
 * 
 * Request Body:
 * {
 *   "username": "string",
 *   "email": "string",
 *   "role_id": number,
 *   "status": "active" | "inactive" | "suspended",
 *   "password": "string" (optional - ถ้าต้องการเปลี่ยน password)
 * }
 */
router.put('/:id', authenticateToken, requireRole('SUPER_USER'), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { username, email, role_id, status, password } = req.body;
    
    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID',
      });
    }
    
    // Validation
    if (!username || !email || !role_id || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: username, email, role_id, status',
      });
    }
    
    // ตรวจสอบว่า user มีอยู่จริง
    const existingUser = await getUserById(userId);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }
    
    // อัพเดท user
    const updatedUser = await updateUser(userId, username, email, role_id, status);
    
    // ถ้ามีการเปลี่ยน password
    if (password) {
      const passwordHash = await hashPassword(password);
      await updateUserPassword(userId, passwordHash);
    }
    
    // ไม่ส่ง password_hash กลับไป
    const { password_hash: _, ...userWithoutPassword } = updatedUser!;
    
    res.json({
      success: true,
      message: 'User updated successfully',
      data: userWithoutPassword,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
});

export default router;
