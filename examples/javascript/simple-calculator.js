/**
 * A simple calculator class with basic arithmetic operations
 */
class Calculator {
  /**
   * Creates a new calculator instance with an optional initial value
   * @param {number} initialValue - The starting value (default: 0)
   */
  constructor(initialValue = 0) {
    this.value = initialValue;
  }

  /**
   * Adds a number to the current value
   * @param {number} num - The number to add
   * @returns {Calculator} - Returns this instance for method chaining
   */
  add(num) {
    this.value += num;
    return this;
  }

  /**
   * Subtracts a number from the current value
   * @param {number} num - The number to subtract
   * @returns {Calculator} - Returns this instance for method chaining
   */
  subtract(num) {
    this.value -= num;
    return this;
  }

  /**
   * Multiplies the current value by a number
   * @param {number} num - The number to multiply by
   * @returns {Calculator} - Returns this instance for method chaining
   */
  multiply(num) {
    this.value *= num;
    return this;
  }

  /**
   * Divides the current value by a number
   * @param {number} num - The number to divide by
   * @returns {Calculator} - Returns this instance for method chaining
   * @throws {Error} - Throws if trying to divide by zero
   */
  divide(num) {
    if (num === 0) {
      throw new Error('Division by zero is not allowed');
    }
    this.value /= num;
    return this;
  }

  /**
   * Returns the current calculator value
   * @returns {number} - The current value
   */
  getValue() {
    return this.value;
  }

  /**
   * Resets the calculator to the specified value
   * @param {number} value - The value to reset to (default: 0)
   * @returns {Calculator} - Returns this instance for method chaining
   */
  reset(value = 0) {
    this.value = value;
    return this;
  }
}

module.exports = Calculator;
