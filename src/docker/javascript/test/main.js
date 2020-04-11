function sum(a, b) {
  return a + b
}
const expect = require('chai').expect;

describe("Sum Function", () => {
it("should return true result - 1", () => {
  expect(sum(1, 2)).equals(3);
});

it("should return true result - 2", () => {
  expect(sum(35325, 53252)).equals(88577);
});

it("should return false result - 1", () => {
  expect(sum(432, 421)).not.equals(4321);
});
});
