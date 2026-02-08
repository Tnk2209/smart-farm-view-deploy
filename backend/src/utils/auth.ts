import jwt, { type SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import type { UserRole } from '../types.js';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'smart-farm-secret-key-change-in-production';
const JWT_EXPIRES_IN: string | number = process.env.JWT_EXPIRES_IN || '24h';
const SALT_ROUNDS = 10;

export interface JwtPayload {
  user_id: number;
  username: string;
  email: string;
  role: UserRole;
  role_id: number;
}

/**
 * Generate JWT token from user data
 */
export function generateToken(payload: JwtPayload): string {
  const tokenPayload: Record<string, any> = {
    user_id: payload.user_id,
    username: payload.username,
    email: payload.email,
    role: payload.role,
    role_id: payload.role_id
  };
  
  return jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hashed password
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Extract token from Authorization header
 * Format: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    return parts[1];
  }

  return null;
}
