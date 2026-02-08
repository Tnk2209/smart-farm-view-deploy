import express, { Request, Response } from 'express';
import { getUserByUsername } from '../database/queries.js';
import { generateToken, comparePassword } from '../utils/auth.js';
import type { ApiResponse } from '../types.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate user and return JWT token
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Username and password are required',
      } as ApiResponse);
    }

    // Find user by username
    const user = await getUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      } as ApiResponse);
    }

    // Check if user is active
    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'Account is not active',
      } as ApiResponse);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid username or password',
      } as ApiResponse);
    }

    // Generate JWT token
    const token = generateToken({
      user_id: user.user_id,
      username: user.username,
      email: user.email,
      role: user.role,
      role_id: user.role_id,
    });

    // Return user data and token
    return res.json({
      success: true,
      data: {
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          role: user.role,
          role_id: user.role_id,
          status: user.status,
        },
        token,
      },
      message: 'Login successful',
    } as ApiResponse);

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side: remove token from localStorage)
 */
router.post('/logout', (req: Request, res: Response) => {
  // With JWT, logout is handled client-side by removing the token
  // This endpoint is here for consistency and future enhancements (e.g., token blacklist)
  
  return res.json({
    success: true,
    message: 'Logout successful',
  } as ApiResponse);
});

/**
 * GET /api/auth/me
 * Get current user info from JWT token
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // User info is attached to request by auth middleware
    const user = (req as any).user;

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      } as ApiResponse);
    }

    return res.json({
      success: true,
      data: user,
    } as ApiResponse);

  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    } as ApiResponse);
  }
});

export default router;
