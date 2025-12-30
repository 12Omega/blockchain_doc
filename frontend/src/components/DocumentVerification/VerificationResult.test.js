import React from "react";
import { render, screen } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import VerificationResult from "./VerificationResult";

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(<ThemeProvider theme={theme}>{component}</ThemeProvider>);
};

describe("VerificationResult", () => {
  const mockValidResult = {
    isValid: true,
    documentHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    timestamp: "2024-01-15T10:30:00.000Z",
    verifier: "0x9876543210987654321098765432109876543210",
    verificationId: "ver_123456789",
    document: {
      metadata: {
        studentName: "John Doe",
        studentId: "STU001",
        institutionName: "Sample University",
        documentType: "degree",
        issueDate: "2023-06-15T00:00:00.000Z",
      },
      issuer: "0x1111111111111111111111111111111111111111",
      owner: "0x2222222222222222222222222222222222222222",
      status: "blockchain_stored",
      createdAt: "2023-06-20T09:00:00.000Z",
      verificationCount: 5,
    },
    blockchain: {
      isValid: true,
      transactionHash:
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      blockNumber: 12345678,
    },
    fileIntegrity: {
      isValid: true,
      hashesMatch: true,
      providedFileHash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      storedFileHash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
  };

  const mockInvalidResult = {
    isValid: false,
    documentHash:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    timestamp: "2024-01-15T10:30:00.000Z",
    verifier: "0x9876543210987654321098765432109876543210",
    verificationId: "ver_123456789",
    document: null,
    blockchain: {
      isValid: false,
    },
    fileIntegrity: null,
  };

  it("renders valid verification result correctly", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    expect(screen.getByText("Verification Result")).toBeInTheDocument();
    expect(screen.getByText("Document is AUTHENTIC")).toBeInTheDocument();
    expect(
      screen.getByText(/has been verified as authentic/i)
    ).toBeInTheDocument();
    expect(screen.getByText("VALID")).toBeInTheDocument();
  });

  it("renders invalid verification result correctly", () => {
    renderWithTheme(<VerificationResult result={mockInvalidResult} />);

    expect(
      screen.getByText("Document verification FAILED")
    ).toBeInTheDocument();
    expect(screen.getByText(/could not be verified/i)).toBeInTheDocument();
    expect(screen.getByText("INVALID")).toBeInTheDocument();
  });

  it("displays verification summary information", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    expect(screen.getByText("Verification Summary")).toBeInTheDocument();
    expect(screen.getByText("1/15/2024, 10:30:00 AM")).toBeInTheDocument(); // Formatted timestamp
    expect(screen.getByText("0x9876...3210")).toBeInTheDocument(); // Formatted verifier address
    expect(screen.getByText("ver_123456789")).toBeInTheDocument(); // Verification ID
  });

  it("displays technical details", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    expect(screen.getByText("Technical Details")).toBeInTheDocument();
    expect(screen.getByText("VERIFIED")).toBeInTheDocument(); // Blockchain status
    expect(screen.getByText("INTACT")).toBeInTheDocument(); // File integrity status
  });

  it("displays document information when available", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    expect(screen.getByText("Document Information")).toBeInTheDocument();
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("STU001")).toBeInTheDocument();
    expect(screen.getByText("Sample University")).toBeInTheDocument();
    expect(screen.getByText("Degree")).toBeInTheDocument(); // Capitalized
    expect(screen.getByText("6/15/2023")).toBeInTheDocument(); // Formatted issue date
    expect(screen.getByText("5 times")).toBeInTheDocument(); // Verification count
  });

  it("displays blockchain details when available", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    expect(screen.getByText("Blockchain Details")).toBeInTheDocument();
    expect(
      screen.getByText(
        "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890"
      )
    ).toBeInTheDocument();
    expect(screen.getByText("12345678")).toBeInTheDocument();
  });

  it("handles missing document information gracefully", () => {
    renderWithTheme(<VerificationResult result={mockInvalidResult} />);

    // Should not show document information section when document is null
    expect(screen.queryByText("Document Information")).not.toBeInTheDocument();
  });

  it("handles missing blockchain details gracefully", () => {
    const resultWithoutBlockchain = {
      ...mockValidResult,
      blockchain: { isValid: false },
    };

    renderWithTheme(<VerificationResult result={resultWithoutBlockchain} />);

    // Should show blockchain status but not detailed blockchain information
    expect(screen.getByText("NOT FOUND")).toBeInTheDocument();
    expect(screen.queryByText("Blockchain Details")).not.toBeInTheDocument();
  });

  it("handles missing file integrity information", () => {
    const resultWithoutFileIntegrity = {
      ...mockValidResult,
      fileIntegrity: null,
    };

    renderWithTheme(<VerificationResult result={resultWithoutFileIntegrity} />);

    // Should not show file integrity status when not available
    expect(screen.queryByText("File Integrity")).not.toBeInTheDocument();
  });

  it("formats addresses correctly", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    // Check that addresses are formatted as expected (first 6 + ... + last 4)
    expect(screen.getByText("0x9876...3210")).toBeInTheDocument(); // Verifier
    expect(screen.getByText("0x1111...1111")).toBeInTheDocument(); // Issuer
    expect(screen.getByText("0x2222...2222")).toBeInTheDocument(); // Owner
  });

  it("formats dates correctly", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    // Check various date formats
    expect(screen.getByText("1/15/2024, 10:30:00 AM")).toBeInTheDocument(); // Verification timestamp
    expect(screen.getByText("6/15/2023")).toBeInTheDocument(); // Issue date
    expect(screen.getByText("6/20/2023, 9:00:00 AM")).toBeInTheDocument(); // Created date
  });

  it("shows appropriate status colors and icons", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    // Valid result should show success colors/icons
    const validChips = screen.getAllByText("VALID");
    expect(validChips.length).toBeGreaterThan(0);

    const verifiedChips = screen.getAllByText("VERIFIED");
    expect(verifiedChips.length).toBeGreaterThan(0);

    const intactChips = screen.getAllByText("INTACT");
    expect(intactChips.length).toBeGreaterThan(0);
  });

  it("shows document status correctly", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    expect(screen.getByText("BLOCKCHAIN_STORED")).toBeInTheDocument();
  });

  it("displays full document hash in monospace font", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    const hashElement = screen.getByText(
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    );
    expect(hashElement).toHaveStyle("font-family: monospace");
  });

  it("shows informational message about verification security", () => {
    renderWithTheme(<VerificationResult result={mockValidResult} />);

    expect(screen.getByText(/cryptographically secured/i)).toBeInTheDocument();
    expect(
      screen.getByText(/independently verified on the blockchain/i)
    ).toBeInTheDocument();
  });

  it("handles edge cases with missing or undefined values", () => {
    const incompleteResult = {
      isValid: true,
      documentHash:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      timestamp: "2024-01-15T10:30:00.000Z",
      verifier: null,
      verificationId: "ver_123456789",
      document: {
        metadata: {
          studentName: null,
          studentId: undefined,
          institutionName: "",
          documentType: "degree",
          issueDate: null,
        },
        issuer: null,
        owner: undefined,
        status: null,
        createdAt: "2023-06-20T09:00:00.000Z",
        verificationCount: null,
      },
    };

    renderWithTheme(<VerificationResult result={incompleteResult} />);

    // Should show N/A for missing values
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);

    // Should show 0 times for null verification count
    expect(screen.getByText("0 times")).toBeInTheDocument();
  });
});
