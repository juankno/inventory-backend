import { isValidQuantity } from "./quantity.ts";

describe("isValidQuantity", () => {
  it("should return false if its not an int number", () => {
    expect(isValidQuantity(30.2)).toBeFalsy();
  });

  it("should return true if the given number is a valid int", () => {
    expect(isValidQuantity(30)).toBeTruthy();
  });
});
