import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DocumentVerification from './DocumentVerification';
import { AuthProvider } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';

// Mock the document service
jest.mock('../../services/documentService');

// Mock the child components
jest.mock('./FileUploadVerification', () => {
  return function MockFileUploadVerification({ onVerify, loading }) {
    return (
      <div data-testid="file-upload-verification">
        <button 
          onClick={() => onVerify(new File(['test'], 'test.pdf', { type: 'application/pdf' }))}
          disabled={loading}
        >
          Verify File
        </button>
      </div>
    );
  };
});

jest.mock('./QRCodeVerification', () => {
  return function MockQRCodeVerification({ onVerify, loading }) {
    return (
      <div data-testid="qr-code-verification">
        <button 
          onClick={() => onVerify('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')}
          disabled={loading}
        >
          Verify Hash
        </button>
      </div>
    );
  };
});

jest.mock('./VerificationHistory', () => {
  return function MockVerificationHistory() {
    return <div data-testid="verification-history">Verification History</div>;
  };
});

jest.mock('./VerificationResult', () => {
  return function MockVerificationResult({ result }) {
    return (
      <div data-testid="verification-result">
        Result: {result.isValid ? 'Valid' : 'Invalid'}
      </div>
    );
  };
});

const theme = createTheme();

const MockAuthProvider = ({ children, user = null }) => {
  const mockContextValue = {
    user,
    isAuthenticated: !!user,
    login: jest.fn(),
    logout: jest.fn(),
  };

  return (
    <AuthProvider value={mockContextValue}>
      {children}
    </AuthProvider>
  );
};

const renderWithProviders = (component, { user = null } = {}) => {
  return render(
    <ThemeProvider theme={theme}>
      <MockAuthProvider user={user}>
        {component}
      </MockAuthProvider>
    </ThemeProvider>
  );
};

describe('DocumentVerification', () => {
  const mockUser = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    role: 'verifier',
    profile: { name: 'Test User' }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders warning when user is not authenticated', () => {
    renderWithProviders(<DocumentVerification />);
    
    expect(screen.getByText(/please connect and authenticate your wallet/i)).toBeInTheDocument();
  });

  it('renders main interface when user is authenticated', () => {
    renderWithProviders(<DocumentVerification />, { user: mockUser });
    
    expect(screen.getByText('Document Verification')).toBeInTheDocument();
    expect(screen.getByText(/verify the authenticity of academic documents/i)).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'File Upload' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'QR Code Scanner' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Verification History' })).toBeInTheDocument();
  });

  it('switches between tabs correctly', () => {
    renderWithProviders(<DocumentVerification />, { user: mockUser });
    
    // Initially shows file upload tab
    expect(screen.getByTestId('file-upload-verification')).toBeInTheDocument();
    
    // Switch to QR code tab
    fireEvent.click(screen.getByRole('tab', { name: 'QR Code Scanner' }));
    expect(screen.getByTestId('qr-code-verification')).toBeInTheDocument();
    
    // Switch to history tab
    fireEvent.click(screen.getByRole('tab', { name: 'Verification History' }));
    expect(screen.getByTestId('verification-history')).toBeInTheDocument();
  });

  it('handles file verification successfully', async () => {
    const mockVerificationResult = {
      data: {
        verification: {
          isValid: true,
          documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          timestamp: new Date().toISOString(),
          verifier: mockUser.walletAddress,
        }
      }
    };

    documentService.verifyDocument.mockResolvedValue(mockVerificationResult);

    renderWithProviders(<DocumentVerification />, { user: mockUser });
    
    // Trigger file verification
    fireEvent.click(screen.getByText('Verify File'));
    
    // Should show loading state
    expect(screen.getByText(/verifying document/i)).toBeInTheDocument();
    
    // Wait for verification to complete
    await waitFor(() => {
      expect(screen.getByText('Document verification completed')).toBeInTheDocument();
      expect(screen.getByTestId('verification-result')).toBeInTheDocument();
      expect(screen.getByText('Result: Valid')).toBeInTheDocument();
    });

    expect(documentService.verifyDocument).toHaveBeenCalledWith(
      expect.any(File)
    );
  });

  it('handles file verification error', async () => {
    const mockError = new Error('Verification failed');
    documentService.verifyDocument.mockRejectedValue(mockError);

    renderWithProviders(<DocumentVerification />, { user: mockUser });
    
    // Trigger file verification
    fireEvent.click(screen.getByText('Verify File'));
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Verification failed')).toBeInTheDocument();
    });
  });

  it('handles hash verification successfully', async () => {
    const mockVerificationResult = {
      data: {
        data: {
          verification: {
            isValid: false,
            documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
            timestamp: new Date().toISOString(),
            verifier: mockUser.walletAddress,
          }
        }
      }
    };

    documentService.api = {
      get: jest.fn().mockResolvedValue(mockVerificationResult)
    };

    renderWithProviders(<DocumentVerification />, { user: mockUser });
    
    // Switch to QR code tab
    fireEvent.click(screen.getByRole('tab', { name: 'QR Code Scanner' }));
    
    // Trigger hash verification
    fireEvent.click(screen.getByText('Verify Hash'));
    
    // Wait for verification to complete
    await waitFor(() => {
      expect(screen.getByText('Document verification completed')).toBeInTheDocument();
      expect(screen.getByTestId('verification-result')).toBeInTheDocument();
      expect(screen.getByText('Result: Invalid')).toBeInTheDocument();
    });

    expect(documentService.api.get).toHaveBeenCalledWith(
      '/documents/verify/0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    );
  });

  it('handles hash verification error', async () => {
    const mockError = {
      response: {
        data: {
          error: 'Document not found'
        }
      }
    };

    documentService.api = {
      get: jest.fn().mockRejectedValue(mockError)
    };

    renderWithProviders(<DocumentVerification />, { user: mockUser });
    
    // Switch to QR code tab
    fireEvent.click(screen.getByRole('tab', { name: 'QR Code Scanner' }));
    
    // Trigger hash verification
    fireEvent.click(screen.getByText('Verify Hash'));
    
    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Document not found')).toBeInTheDocument();
    });
  });

  it('clears results when switching tabs', async () => {
    const mockVerificationResult = {
      data: {
        verification: {
          isValid: true,
          documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          timestamp: new Date().toISOString(),
          verifier: mockUser.walletAddress,
        }
      }
    };

    documentService.verifyDocument.mockResolvedValue(mockVerificationResult);

    renderWithProviders(<DocumentVerification />, { user: mockUser });
    
    // Trigger file verification
    fireEvent.click(screen.getByText('Verify File'));
    
    // Wait for verification to complete
    await waitFor(() => {
      expect(screen.getByTestId('verification-result')).toBeInTheDocument();
    });

    // Switch tabs
    fireEvent.click(screen.getByRole('tab', { name: 'QR Code Scanner' }));
    
    // Result should be cleared
    expect(screen.queryByTestId('verification-result')).not.toBeInTheDocument();
  });

  it('dismisses success and error messages', async () => {
    const mockVerificationResult = {
      data: {
        verification: {
          isValid: true,
          documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          timestamp: new Date().toISOString(),
          verifier: mockUser.walletAddress,
        }
      }
    };

    documentService.verifyDocument.mockResolvedValue(mockVerificationResult);

    renderWithProviders(<DocumentVerification />, { user: mockUser });
    
    // Trigger file verification
    fireEvent.click(screen.getByText('Verify File'));
    
    // Wait for success message
    await waitFor(() => {
      expect(screen.getByText('Document verification completed')).toBeInTheDocument();
    });

    // Dismiss success message
    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);
    
    expect(screen.queryByText('Document verification completed')).not.toBeInTheDocument();
  });
});