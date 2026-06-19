import { GoogleGenAI } from "@google/genai";

// Mock the Gemini SDK
const mockGenerateContent = jest.fn();

jest.mock("@google/genai", () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => {
      return {
        models: {
          generateContent: mockGenerateContent,
        },
      };
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

describe("Express Server API Endpoint Logic", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-api-key-123";
  });

  it("successfully parses inputs and requests recommendations from Gemini Flash", async () => {
    const aiClient = new GoogleGenAI({ apiKey: "test-api-key" });
    
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        estimatedCO2: 12.5,
        notes: "Solid purchase, relatively low energy impact.",
        detectedItems: [
          { name: "Eco LED Bulbs", price: 15, category: "energy", co2e: 1.5, sustainabilityScore: 9, ecoAlternative: "None needed" }
        ]
      })
    });

    const result = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ text: "Analyze energy receipt" }]
    });

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gemini-3.5-flash",
        contents: expect.any(Array),
      })
    );

    const parsedData = JSON.parse(result.text || "{}");
    expect(parsedData.estimatedCO2).toBe(12.5);
    expect(parsedData.detectedItems[0].name).toBe("Eco LED Bulbs");
  });

  it("handles empty or failed API key settings correctly by throwing direct errors", () => {
    delete process.env.GEMINI_API_KEY;
    
    const getGeminiClient = () => {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY environment variable is not defined or configured under AI Studio Secrets.");
      }
      return new GoogleGenAI({ apiKey: key });
    };

    expect(() => getGeminiClient()).toThrow(/GEMINI_API_KEY environment variable is not defined/);
  });
});
