export type NamePart = {
  value: string;
  type: string;
};

export const constructFullName = (nameParts: NamePart[]): string => {
  const givenNames = nameParts
    .filter((part) => part.type === "GivenName")
    .map((part) => part.value)
    .join(" ");
  const familyName = nameParts
    .filter((part) => part.type === "FamilyName")
    .map((part) => part.value)
    .join(" ");
  return `${givenNames} ${familyName}`;
};
