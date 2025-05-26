/**
 * Authentication Middleware
 * Handles JWT token validation and user authorization
 */
const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const UserService = require('../services/userService');
const logger = require('../utils/logger');

const userService = new UserService();

/**
 * Verify JWT token and attach user to request
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function authenticate(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');

    // Get user from database
    const user = await userService.getUserById(decoded.id);

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid token or inactive user');
    }

    // Attach user to request
    req.user = user;
    req.userId = user.id;

    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
}

/**
 * Check if user has required role(s)
 * @param {...string} roles - Required roles
 * @returns {Function} Express middleware function
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (roles.length && !roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.email} - required roles: ${roles.join(', ')}`);
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
}

/**
 * Optional authentication - doesn't fail if no token provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
async function optionalAuthenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without user
      return next();
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');

    // Try to get user, but don't fail if not found
    try {
      const user = await userService.getUserById(decoded.id);
      if (user && user.isActive) {
        req.user = user;
        req.userId = user.id;
      }
    } catch (error) {
      // User not found or error getting user, continue without user
      logger.debug('Optional auth: user not found', error);
    }

    next();

  } catch (error) {
    // Token verification failed, continue without user
    logger.debug('Optional auth: token verification failed', error);
    next();
  }
}

/**
 * Rate limiting middleware based on user
 * @param {number} maxRequests - Maximum requests per window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware function
 */
function rateLimitByUser(maxRequests = 100, windowMs = 15 * 60 * 1000) {
  const requests = new Map();

  return (req, res, next) => {
    if (!req.userId) {
      return next();
    }

    const now = Date.now();
    const userRequests = requests.get(req.userId) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(timestamp => now - timestamp < windowMs);

    if (validRequests.length >= maxRequests) {
      return next(new ForbiddenError('Rate limit exceeded'));
    }

    validRequests.push(now);
    requests.set(req.userId, validRequests);

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      for (const [userId, timestamps] of requests.entries()) {
        const valid = timestamps.filter(ts => now - ts < windowMs);
        if (valid.length === 0) {
          requests.delete(userId);
        } else {
          requests.set(userId, valid);
        }
      }
    }

    next();
  };
}

/**
 * Check if user owns the requested resource
 * @param {Function} getResourceOwnerId - Function to get owner ID from request
 * @returns {Function} Express middleware function
 */
function checkResourceOwnership(getResourceOwnerId) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new UnauthorizedError('Authentication required'));
      }

      // Admin can access any resource
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceOwnerId = await getResourceOwnerId(req);

      if (resourceOwnerId !== req.userId) {
        return next(new ForbiddenError('Access denied to this resource'));
      }

      next();

    } catch (error) {
      next(error);
    }
  };
}

/**
 * Log authentication events
 * @param {string} event - Event type
 * @returns {Function} Express middleware function
 */
function logAuthEvent(event) {
  return (req, res, next) => {
    if (req.user) {
      logger.info(`Auth event: ${event}`, {
        userId: req.user.id,
        email: req.user.email,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
    }
    next();
  };
}

module.exports = {
  authenticate,
  authorize,
  optionalAuthenticate,
  rateLimitByUser,
  checkResourceOwnership,
  logAuthEvent
};
