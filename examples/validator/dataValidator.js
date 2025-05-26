/**
 * Data Validator Utility
 * Provides comprehensive data validation functions
 */

class DataValidator {
  constructor() {
    this.rules = new Map();
    this.customValidators = new Map();
  }

  /**
   * Define validation schema
   * @param {string} name - Schema name
   * @param {Object} schema - Validation rules
   * @returns {DataValidator} Returns this for chaining
   */
  defineSchema(name, schema) {
    this.rules.set(name, schema);
    return this;
  }

  /**
   * Register custom validator
   * @param {string} name - Validator name
   * @param {Function} validator - Validator function
   * @returns {DataValidator} Returns this for chaining
   */
  registerValidator(name, validator) {
    if (typeof validator !== 'function') {
      throw new Error('Validator must be a function');
    }
    this.customValidators.set(name, validator);
    return this;
  }

  /**
   * Validate data against schema
   * @param {*} data - Data to validate
   * @param {string|Object} schemaOrName - Schema name or schema object
   * @returns {Object} Validation result
   */
  validate(data, schemaOrName) {
    const schema = typeof schemaOrName === 'string'
        ? this.rules.get(schemaOrName)
        : schemaOrName;

    if (!schema) {
      throw new Error(`Schema not found: ${schemaOrName}`);
    }

    const errors = {};
    const validated = {};

    // Validate each field
    for (const [field, rules] of Object.entries(schema)) {
      const value = this.getNestedValue(data, field);
      const fieldErrors = this.validateField(value, rules, field);

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      } else if (value !== undefined) {
        this.setNestedValue(validated, field, value);
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      data: validated
    };
  }

  /**
   * Validate single field
   * @private
   * @param {*} value - Field value
   * @param {Object|Array} rules - Validation rules
   * @param {string} fieldName - Field name for error messages
   * @returns {Array} Array of error messages
   */
  validateField(value, rules, fieldName) {
    const errors = [];
    const rulesList = Array.isArray(rules) ? rules : [rules];

    for (const rule of rulesList) {
      if (typeof rule === 'string') {
        // Simple type validation
        if (!this.validateType(value, rule)) {
          errors.push(`${fieldName} must be a ${rule}`);
        }
      } else if (typeof rule === 'object') {
        // Complex validation rules
        const ruleErrors = this.applyRules(value, rule, fieldName);
        errors.push(...ruleErrors);
      } else if (typeof rule === 'function') {
        // Custom validator function
        const result = rule(value, fieldName);
        if (result !== true) {
          errors.push(result || `${fieldName} validation failed`);
        }
      }
    }

    return errors;
  }

  /**
   * Apply complex validation rules
   * @private
   */
  applyRules(value, rules, fieldName) {
    const errors = [];

    // Type validation
    if (rules.type && !this.validateType(value, rules.type)) {
      errors.push(`${fieldName} must be a ${rules.type}`);
      return errors; // Skip other validations if type is wrong
    }

    // Required validation
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${fieldName} is required`);
      return errors;
    }

    // Skip other validations if value is not required and not provided
    if (!rules.required && (value === undefined || value === null)) {
      return errors;
    }

    // String validations
    if (typeof value === 'string') {
      if (rules.minLength && value.length < rules.minLength) {
        errors.push(`${fieldName} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength && value.length > rules.maxLength) {
        errors.push(`${fieldName} must not exceed ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`${fieldName} has invalid format`);
      }
      if (rules.email && !this.isValidEmail(value)) {
        errors.push(`${fieldName} must be a valid email`);
      }
      if (rules.url && !this.isValidUrl(value)) {
        errors.push(`${fieldName} must be a valid URL`);
      }
    }

    // Number validations
    if (typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`${fieldName} must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`${fieldName} must not exceed ${rules.max}`);
      }
      if (rules.integer && !Number.isInteger(value)) {
        errors.push(`${fieldName} must be an integer`);
      }
      if (rules.positive && value <= 0) {
        errors.push(`${fieldName} must be positive`);
      }
    }

    // Array validations
    if (Array.isArray(value)) {
      if (rules.minItems && value.length < rules.minItems) {
        errors.push(`${fieldName} must have at least ${rules.minItems} items`);
      }
      if (rules.maxItems && value.length > rules.maxItems) {
        errors.push(`${fieldName} must not exceed ${rules.maxItems} items`);
      }
      if (rules.unique && !this.isArrayUnique(value)) {
        errors.push(`${fieldName} must contain unique items`);
      }
      if (rules.items) {
        // Validate each array item
        value.forEach((item, index) => {
          const itemErrors = this.validateField(item, rules.items, `${fieldName}[${index}]`);
          errors.push(...itemErrors);
        });
      }
    }

    // Enum validation
    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${fieldName} must be one of: ${rules.enum.join(', ')}`);
    }

    // Custom validator
    if (rules.custom) {
      const customValidator = this.customValidators.get(rules.custom);
      if (customValidator) {
        const result = customValidator(value, fieldName);
        if (result !== true) {
          errors.push(result || `${fieldName} validation failed`);
        }
      }
    }

    // Nested object validation
    if (rules.properties && typeof value === 'object' && !Array.isArray(value)) {
      const nestedResult = this.validate(value, rules.properties);
      if (!nestedResult.isValid) {
        for (const [nestedField, nestedErrors] of Object.entries(nestedResult.errors)) {
          errors.push(...nestedErrors.map(err => err.replace(nestedField, `${fieldName}.${nestedField}`)));
        }
      }
    }

    return errors;
  }

  /**
   * Validate data type
   * @private
   */
  validateType(value, type) {
    switch (type) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'array':
        return Array.isArray(value);
      case 'object':
        return value !== null && typeof value === 'object' && !Array.isArray(value);
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value));
      case 'null':
        return value === null;
      case 'undefined':
        return value === undefined;
      default:
        return true;
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
   * Check if URL is valid
   * @private
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if array contains unique values
   * @private
   */
  isArrayUnique(array) {
    return new Set(array).size === array.length;
  }

  /**
   * Get nested value from object
   * @private
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  /**
   * Set nested value in object
   * @private
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((curr, key) => {
      if (!curr[key]) curr[key] = {};
      return curr[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Create a sanitizer function for a schema
   * @param {string|Object} schemaOrName - Schema name or schema object
   * @returns {Function} Sanitizer function
   */
  createSanitizer(schemaOrName) {
    return (data) => {
      const result = this.validate(data, schemaOrName);
      if (!result.isValid) {
        throw new ValidationError('Validation failed', result.errors);
      }
      return result.data;
    };
  }
}

/**
 * Validation Error class
 */
class ValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Export singleton instance with common validators pre-registered
const validator = new DataValidator();

// Register common custom validators
validator.registerValidator('phone', (value) => {
  const phoneRegex = /^\+?[\d\s-()]+$/;
  return phoneRegex.test(value) ? true : 'Invalid phone number format';
});

validator.registerValidator('alphanumeric', (value) => {
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(value) ? true : 'Must contain only letters and numbers';
});

validator.registerValidator('strongPassword', (value) => {
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(value)) return 'Password must contain uppercase letter';
  if (!/[a-z]/.test(value)) return 'Password must contain lowercase letter';
  if (!/[0-9]/.test(value)) return 'Password must contain number';
  if (!/[!@#$%^&*]/.test(value)) return 'Password must contain special character';
  return true;
});

module.exports = {
  DataValidator,
  ValidationError,
  validator
};
