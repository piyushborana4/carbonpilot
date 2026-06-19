export const mockGenerateContent = jest.fn();

export class MockGoogleGenAI {
  models = {
    generateContent: mockGenerateContent,
  };
}

jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return new MockGoogleGenAI();
    }),
    Type: {
      OBJECT: "OBJECT",
      ARRAY: "ARRAY",
      STRING: "STRING",
      NUMBER: "NUMBER",
      INTEGER: "INTEGER",
    },
  };
});
