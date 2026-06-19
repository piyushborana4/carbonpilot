// Load our standard mocks first
import "../mocks/firebaseMock";

import { handleFirestoreError, validateFirestoreConnection, OperationType } from "../../firebase";
import { getDocFromServer } from "firebase/firestore";

describe("Firebase Utility & Hardened Security Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleFirestoreError", () => {
    it("correctly stringifies error information containing user metadata", () => {
      const mockError = new Error("Permission denied: insufficient credentials");
      
      expect(() => {
        handleFirestoreError(mockError, OperationType.UPDATE, "users/test-user-123");
      }).toThrow();

      try {
        handleFirestoreError(mockError, OperationType.UPDATE, "users/test-user-123");
      } catch (err: any) {
        const errorData = JSON.parse(err.message);
        expect(errorData.error).toBe("Permission denied: insufficient credentials");
        expect(errorData.operationType).toBe("update");
        expect(errorData.path).toBe("users/test-user-123");
        expect(errorData.authInfo.userId).toBe("test-user-123");
        expect(errorData.authInfo.email).toBe("testuser@gmail.com");
      }
    });

    it("handles non-Error objects gracefully", () => {
      expect(() => {
        handleFirestoreError("String-based error message", OperationType.DELETE, null);
      }).toThrow(/String-based error message/);
    });
  });

  describe("validateFirestoreConnection", () => {
    it("completes successfully on a valid backend query", async () => {
      (getDocFromServer as jest.Mock).mockResolvedValueOnce({
        exists: () => true,
      });

      await expect(validateFirestoreConnection()).resolves.not.toThrow();
    });

    it("logs a console warning when encountering an offline network state", async () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
      (getDocFromServer as jest.Mock).mockRejectedValueOnce(new Error("offline"));

      await validateFirestoreConnection();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Firestore is operating offline")
      );
      consoleWarnSpy.mockRestore();
    });
  });
});
