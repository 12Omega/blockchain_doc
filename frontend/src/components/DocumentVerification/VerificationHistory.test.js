import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import VerificationHistory from './VerificationHistory';
import { AuthProvider } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';

// Mock the document service
jest.mock('../../services/documentService');

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

describe('VerificationHistory', () => {
  const mockUser = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    role: 'verifier',
    profile: { name: 'Test User' }
  };

  const mockVerifications = [
    {
      verificationId: 'ver_001',
      documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      timestamp: '2024-01-15T10:30:00.000Z',
      isValid: true,
      verifier: mockUser.walletAddress,
      document: {
        metadata: {
          studentName: 'John Doe',
          documentType: 'degree',
          institutionName: 'Sample University'
        }
      }
    },
    {
      verificationId: 'ver_002',
      documentHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
      timestamp: '2024-01-14T15:45:00.000Z',
      isValid: false,
      verifier: mockUser.walletAddress,
      document: null
    }
  ];

  const mockAuditData = {
    documentHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    events: [
      {
        type: 'document_created',
        timestamp: '2023-06-20T09:00:00.000Z',
        actor: '0x1111111111111111111111111111111111111111',
        details: { issuer: '0x1111111111111111111111111111111111111111' }
      },
      {
        type: 'blockchain_registered',
        timestamp: '2023-06-20T09:05:00.000Z',
        actor: '0x1111111111111111111111111111111111111111',
        details: { transactionHash: '0xabc123' }
      }
    ],
    statistics: {
      verificationCount: 5,
      lastVerified: '2024-01-15T10:30:00.000Z',
      age: 180
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock the API calls
    documentService.api = {
      get: jest.fn()
    };
  });

  it('renders warning when user is not authenticated', () => {
    renderWithProviders(<VerificationHistory />);
    
    expect(screen.getByText(/please connect and authenticate your wallet/i)).toBeInTheDocument();
  });

  it('renders verification history interface when user is authenticated', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 2
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('Verification History')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/search by document hash/i)).toBeInTheDocument();
    });
  });

  it('displays verification data in table', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 2
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('ver_001')).toBeInTheDocument();
      expect(screen.getByText('ver_002')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Valid')).toBeInTheDocument();
      expect(screen.getByText('Invalid')).toBeInTheDocument();
    });
  });

  it('handles API error and shows mock data', async () => {
    documentService.api.get.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText(/failed to load verification history/i)).toBeInTheDocument();
      // Should still show mock data
      expect(screen.getByText('ver_001')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 2
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search by document hash/i)).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/search by document hash/i);
    fireEvent.change(searchInput, { target: { value: 'John Doe' } });

    // Should trigger new API call with search parameter
    await waitFor(() => {
      expect(documentService.api.get).toHaveBeenCalledWith('/documents/verifications', {
        params: {
          page: 1,
          limit: 10,
          search: 'John Doe'
        }
      });
    });
  });

  it('handles pagination', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 25
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('Verification History')).toBeInTheDocument();
    });

    // Change page
    const nextPageButton = screen.getByRole('button', { name: /go to next page/i });
    fireEvent.click(nextPageButton);

    await waitFor(() => {
      expect(documentService.api.get).toHaveBeenCalledWith('/documents/verifications', {
        params: {
          page: 2,
          limit: 10,
          search: ''
        }
      });
    });
  });

  it('opens verification details dialog', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 2
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('ver_001')).toBeInTheDocument();
    });

    // Click view details button
    const viewButtons = screen.getAllByRole('button', { name: /view details/i });
    fireEvent.click(viewButtons[0]);

    expect(screen.getByText('Verification Details')).toBeInTheDocument();
    expect(screen.getByText('ver_001')).toBeInTheDocument();
  });

  it('opens audit trail dialog', async () => {
    documentService.api.get
      .mockResolvedValueOnce({
        data: {
          data: {
            verifications: mockVerifications,
            totalCount: 2
          }
        }
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            audit: mockAuditData
          }
        }
      });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('ver_001')).toBeInTheDocument();
    });

    // Click audit trail button (second button for first row)
    const auditButtons = screen.getAllByRole('button', { name: /view audit trail/i });
    fireEvent.click(auditButtons[0]);

    expect(screen.getByText('Document Audit Trail')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('DOCUMENT_CREATED')).toBeInTheDocument();
      expect(screen.getByText('BLOCKCHAIN_REGISTERED')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument(); // Verification count
      expect(screen.getByText('180 days')).toBeInTheDocument(); // Document age
    });
  });

  it('handles refresh functionality', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 2
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('Verification History')).toBeInTheDocument();
    });

    // Click refresh button
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Should trigger new API call
    await waitFor(() => {
      expect(documentService.api.get).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('exports verification data to CSV', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 2
        }
      }
    });

    // Mock URL.createObjectURL and related methods
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();
    
    const mockClick = jest.fn();
    const mockAnchor = {
      href: '',
      download: '',
      click: mockClick
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor);

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('Verification History')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByRole('button', { name: /export to csv/i });
    fireEvent.click(exportButton);

    expect(mockClick).toHaveBeenCalled();
    expect(mockAnchor.download).toContain('verification-history-');
    expect(mockAnchor.download).toContain('.csv');
  });

  it('shows loading state', () => {
    documentService.api.get.mockImplementation(() => new Promise(() => {})); // Never resolves

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows empty state when no verifications found', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: [],
          totalCount: 0
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('No verification history found')).toBeInTheDocument();
    });
  });

  it('formats addresses correctly in table', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 2
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      // Should show truncated hash format
      expect(screen.getByText('0x1234...cdef')).toBeInTheDocument();
      expect(screen.getByText('0xabcd...7890')).toBeInTheDocument();
    });
  });

  it('handles rows per page change', async () => {
    documentService.api.get.mockResolvedValue({
      data: {
        data: {
          verifications: mockVerifications,
          totalCount: 25
        }
      }
    });

    renderWithProviders(<VerificationHistory />, { user: mockUser });
    
    await waitFor(() => {
      expect(screen.getByText('Verification History')).toBeInTheDocument();
    });

    // Change rows per page
    const rowsPerPageSelect = screen.getByRole('combobox');
    fireEvent.mouseDown(rowsPerPageSelect);
    
    const option25 = screen.getByRole('option', { name: '25' });
    fireEvent.click(option25);

    await waitFor(() => {
      expect(documentService.api.get).toHaveBeenCalledWith('/documents/verifications', {
        params: {
          page: 1,
          limit: 25,
          search: ''
        }
      });
    });
  });
});