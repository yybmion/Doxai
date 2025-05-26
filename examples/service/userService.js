/**
 * User Service
 * Handles all user-related business logic and data operations
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { UserRepository } = require('../repositories/userRepository');
const { ValidationError, NotFoundError } = require('../utils/errors');
const { sendEmail } = require('../utils/emailService');
const logger = require('../utils/logger');

class UserService {
  constructor() {
    this.userRepository = new UserRepository();
    this.saltRounds = 10;
    this.jwtSecret = process.env.JWT_SECRET || 'default-secret';
  }

  /**
   * Create a new user
   * @param {Object} userData - User data object
   * @param {string} userData.email - User email
   * @param {string} userData.password - User password
   * @param {string} userData.name - User full name
   * @param {string} [userData.role='user'] - User role
   * @returns {Promise<Object>} Created user object (without password)
   * @throws {ValidationError} If user data is invalid
   */
  async createUser(userData) {
    try {
      // Validate input
      this.validateUserData(userData);

      // Check if user already exists
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new ValidationError('User with this email already exists');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, this.saltRounds);

      // Create user
      const user = await this.userRepository.create({
        ...userData,
        password: hashedPassword,
        role: userData.role || 'user',
        isActive: true,
        createdAt: new Date()
      });

      // Send welcome email
      await this.sendWelcomeEmail(user);

      // Remove password from response
      const { password, ...userWithoutPassword } = user;

      logger.info(`New user created: ${user.email}`);
      return userWithoutPassword;

    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }

  /**
   * Authenticate user and generate JWT token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} Object containing user and token
   * @throws {ValidationError} If credentials are invalid
   */
  async authenticateUser(email, password) {
    // Find user
    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new ValidationError('Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      throw new ValidationError('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new ValidationError('Invalid email or password');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Update last login
    await this.userRepository.updateLastLogin(user.id);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    logger.info(`User authenticated: ${user.email}`);
    return {
      user: userWithoutPassword,
      token
    };
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User object (without password)
   * @throws {NotFoundError} If user not found
   */
  async getUserById(userId) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} Success status
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ValidationError('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, this.saltRounds);

    // Update password
    await this.userRepository.update(userId, {
      password: hashedPassword,
      updatedAt: new Date()
    });

    logger.info(`Password changed for user: ${userId}`);
    return true;
  }

  /**
   * Get all users with pagination
   * @param {Object} options - Query options
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=10] - Items per page
   * @param {string} [options.sortBy='createdAt'] - Sort field
   * @param {string} [options.sortOrder='desc'] - Sort order
   * @returns {Promise<Object>} Paginated users result
   */
  async getAllUsers(options = {}) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = options;

    const result = await this.userRepository.findAll({
      page,
      limit,
      sortBy,
      sortOrder
    });

    // Remove passwords from all users
    result.users = result.users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });

    return result;
  }

  /**
   * Delete user (soft delete)
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUser(userId) {
    const result = await this.userRepository.softDelete(userId);
    if (!result) {
      throw new NotFoundError('User not found');
    }

    logger.info(`User deleted: ${userId}`);
    return true;
  }

  /**
   * Search users by name or email
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of matching users
   */
  async searchUsers(query) {
    if (!query || query.length < 2) {
      return [];
    }

    const users = await this.userRepository.search(query);

    // Remove passwords
    return users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  // Private helper methods

  /**
   * Validate user data
   * @private
   */
  validateUserData(userData) {
    const { email, password, name } = userData;

    if (!email || !this.isValidEmail(email)) {
      throw new ValidationError('Invalid email address');
    }

    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    if (!name || name.trim().length < 2) {
      throw new ValidationError('Name must be at least 2 characters long');
    }
  }

  /**
   * Check if email is valid
   * @private
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate JWT token
   * @private
   */
  generateToken(user) {
    return jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role
        },
        this.jwtSecret,
        { expiresIn: '24h' }
    );
  }

  /**
   * Send welcome email
   * @private
   */
  async sendWelcomeEmail(user) {
    try {
      await sendEmail({
        to: user.email,
        subject: 'Welcome to Our Platform!',
        template: 'welcome',
        data: {
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      // Log error but don't throw - email failure shouldn't prevent user creation
      logger.error('Failed to send welcome email:', error);
    }
  }
}

module.exports = UserService;
