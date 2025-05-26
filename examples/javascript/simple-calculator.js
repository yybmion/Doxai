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
