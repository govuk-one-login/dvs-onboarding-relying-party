import { constructFullName, NamePart } from "./core-identity-helper.js";

describe("Core identity helper tests", () => {
  it("should construct name from name parts with multiple given names", () => {
    const nameParts: NamePart[] = [
      { value: "Alice", type: "GivenName" },
      { value: "Doe", type: "FamilyName" },
      { value: "Jane", type: "GivenName" },
    ];

    const fullName = constructFullName(nameParts);
    expect(fullName).toStrictEqual("Alice Jane Doe");
  });

  it("should construct name from name parts with multiple given names", () => {
    const nameParts: NamePart[] = [
      { value: "Jones", type: "FamilyName" },
      { value: "Alice", type: "GivenName" },
      { value: "Doe", type: "FamilyName" },
    ];

    const fullName = constructFullName(nameParts);
    expect(fullName).toStrictEqual("Alice Jones Doe");
  });
});
