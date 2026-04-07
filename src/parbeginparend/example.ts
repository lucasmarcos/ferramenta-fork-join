export const exampleParbeginParend = `BEGIN
  A;
  PARBEGIN
    BEGIN
      B;
      C;
    END
    BEGIN
      D;
      E;
    END
  PAREND;
  F;
END
`;
