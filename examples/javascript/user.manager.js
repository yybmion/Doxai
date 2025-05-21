/**
 * A simple user management class for handling user operations
 */
class UserManager {
  /**
   * Creates a new UserManager instance
   */
  constructor() {
    this.users = new Map();
  }

  /**
   * Adds a new user to the system
   * @param {string} id - Unique identifier for the user
   * @param {Object} userData - User information
   * @param {string} userData.name - User's full name
   * @param {string} userData.email - User's email address
   * @param {string} [userData.role='user'] - User's role in the system
   * @returns {boolean} - True if user was added successfully, false if user already exists
   */
  addUser(id, userData) {
    if (this.users.has(id)) {
      return false;
    }

    // Set default role if not provided
    if (!userData.role) {
      userData.role = 'user';
    }

    // Add user to the map
    this.users.set(id, {
      ...userData,
      createdAt: new Date(),
      lastLogin: null
    });

    return true;
  }

  /**
   * Retrieves a user by their ID
   * @param {string} id - The user ID to look up
   * @returns {Object|null} - The user object or null if not found
   */
  getUser(id) {
    return this.users.has(id) ? this.users.get(id) : null;
  }

  /**
   * Updates an existing user's information
   * @param {string} id - The user ID to update
   * @param {Object} updatedData - The data to update
   * @returns {boolean} - True if user was updated successfully, false if user doesn't exist
   */
  updateUser(id, updatedData) {
    if (!this.users.has(id)) {
      return false;
    }

    const user = this.users.get(id);
    this.users.set(id, {
      ...user,
      ...updatedData,
      updatedAt: new Date()
    });

    return true;
  }

  /**
   * Removes a user from the system
   * @param {string} id - The user ID to remove
   * @returns {boolean} - True if user was removed successfully, false if user doesn't exist
   */
  removeUser(id) {
    return this.users.delete(id);
  }

  /**
   * Records a user login event
   * @param {string} id - The user ID
   * @returns {boolean} - True if login was recorded, false if user doesn't exist
   */
  recordLogin(id) {
    if (!this.users.has(id)) {
      return false;
    }

    const user = this.users.get(id);
    user.lastLogin = new Date();
    this.users.set(id, user);

    return true;
  }

  /**
   * Gets all users with a specific role
   * @param {string} role - The role to filter by
   * @returns {Array} - Array of user objects with the specified role
   */
  getUsersByRole(role) {
    const result = [];
    this.users.forEach(user => {
      if (user.role === role) {
        result.push(user);
      }
    });
    return result;
  }
}

module.exports = UserManager;
