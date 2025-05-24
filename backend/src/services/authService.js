const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/knex');
const { v4: uuidv4 } = require('uuid');

class AuthService {
  
  // Register a new user
  async registerUser(userData) {
    const { email, password, name } = userData;
    
    // Check if user already exists
    const existingUser = await this.getUserByEmail(email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Start a transaction to create user and wallet together
    const trx = await db.transaction();
    
    try {
      // Create the user first
      const [user] = await trx('users')
        .insert({
          email,
          password_hash: passwordHash,
          name
        })
        .returning(['id', 'email', 'name', 'created_at']);
      
      // Create a wallet for the user
      const [wallet] = await trx('wallets')
        .insert({
          user_id: user.id,
          balance: 0.00,
          currency: 'USD'
        })
        .returning('wallet_id');
      
      // Update user with wallet_id
      const [finalUser] = await trx('users')
        .where('id', user.id)
        .update({ wallet_id: wallet.wallet_id })
        .returning(['id', 'email', 'name', 'wallet_id', 'created_at']);
      
      await trx.commit();
      
      return {
        id: finalUser.id,
        email: finalUser.email,
        name: finalUser.name,
        walletId: finalUser.wallet_id,
        createdAt: finalUser.created_at
      };
      
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
  
  // Login user
  async loginUser(email, password) {
    // Get user by email
    const user = await this.getUserByEmail(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }
    
    // Generate JWT token
    const token = this.generateToken(user);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        walletId: user.wallet_id
      },
      token
    };
  }
  
  // Get user by email
  async getUserByEmail(email) {
    const user = await db('users')
      .where('email', email)
      .first();
    
    return user || null;
  }
  
  // Get user by ID
  async getUserById(userId) {
    const user = await db('users')
      .where('id', userId)
      .select(['id', 'email', 'name', 'wallet_id', 'created_at', 'updated_at'])
      .first();
    
    return user || null;
  }
  
  // Generate JWT token
  generateToken(user) {
    const payload = {
      userId: user.id,
      email: user.email,
      walletId: user.wallet_id
    };
    
    const options = {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'ecommerce-api'
    };
    
    return jwt.sign(payload, process.env.JWT_SECRET, options);
  }
  
  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }
  
  // Update user profile
  async updateUserProfile(userId, updateData) {
    const { name } = updateData;
    
    const [user] = await db('users')
      .where('id', userId)
      .update({
        name: name || db.ref('name'),
        updated_at: db.fn.now()
      })
      .returning(['id', 'email', 'name', 'wallet_id', 'created_at', 'updated_at']);
    
    return user || null;
  }
  
  // Change password
  async changePassword(userId, currentPassword, newPassword) {
    // Get user with password hash
    const user = await db('users')
      .where('id', userId)
      .first();
    
    if (!user) {
      throw new Error('User not found');
    }
    
    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValidPassword) {
      throw new Error('Current password is incorrect');
    }
    
    // Hash new password
    const saltRounds = 12;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);
    
    // Update password
    const [updatedUser] = await db('users')
      .where('id', userId)
      .update({
        password_hash: newPasswordHash,
        updated_at: db.fn.now()
      })
      .returning(['id', 'email', 'name', 'wallet_id']);
    
    return updatedUser;
  }
}

module.exports = new AuthService(); 