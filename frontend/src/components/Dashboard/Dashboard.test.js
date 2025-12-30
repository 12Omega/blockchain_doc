import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import Dashboard from './Dashboard';
import { AuthProvider } from '../../contexts/AuthContext';
import documentService from '../../services/documentService';

// Mock the document service
jest.mock('../../services/documentService');

// Mock the auth context
const mockUser = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  role: 'student',
  profile: { name: 'Test User' }
};

const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn()
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }) => children
}));

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      <AuthProvider>
        {component}
      </AuthProvider>
    </ThemeProvider>
  );
};

// Mock documents data
const mockDocuments = [
  {
    _id: '1',
    documentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
    ipfsHash: 'QmTest123',
    metadata: {
      studentName: 'John Doe',
      studentId: 'STU001',
      institutionName: 'Test University',
      documentType: 'degree',
      issueDate: '2023-06-15T00:00:00.000Z',
      course: 'Computer Science'
    },
    status: 'blockchain_stored',
    access: {
      owner: '0x1234567890123456789012345678901234567890',
      issuer: '0x1234567890123456789012345678901234567890',
      authorizedViewers: []
    },
    audit: {
      createdAt: '2023-06-15T10:00:00.000Z',
      verificationCount: 5
    },
    fileInfo: {
      originalName: 'degree.pdf',
      size: 1024000
    }
  },
  {
    _id: '2',
    documentHash: '0x2345678901234567890123456789012345678901234567890123456789012345',
    ipfsHash: 'QmTest456',
    metadata: {
      studentName: 'Jane Smith',
      studentId: 'STU002',
      institutionName: 'Test College',
      documentType: 'certificate',
      issueDate: '2023-05-20T00:00:00.000Z'
    },
    status: 'uploaded',
    access: {
      owner: '0x1234567890123456789012345678901234567890',
      issuer: '0x2345678901234567890123456789012345678901',
      authorizedViewers: []
    },
    audit: {
      createdAt: '2023-05-20T14:30:00.000Z',
      verificationCount: 2
    },
    fileInfo: {
      originalName: 'certificate.pdf',
      size: 512000
    }
  }
];

describe('Dashboard Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock successful API response
    documentService.getUserDocuments.mockResolvedValue({
      success: true,
      data: {
        documents: mockDocuments,
        pagination: {
          current: 1,
          pages: 1,
          total: 2,
          limit: 12
        }
      }
    });
  });

  test('renders dashboard with documents', async () => {
    renderWithTheme(<Dashboard />);

    // Check if header is rendered
    expect(screen.getByText('Document Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Manage your documents and view verification status')).toBeInTheDocument();

    // Wait for documents to load
    await waitFor(() => {
      expect(screen.getByText('Degree')).toBeInTheDocument();
      expect(screen.getByText('Certificate')).toBeInTheDocument();
    });

    // Check document details
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Test University')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Test College')).toBeInTheDocument();
  });

  test('handles search functionality', async () => {
    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Degree')).toBeInTheDocument();
    });

    // Find and use search input
    const searchInput = screen.getByPlaceholderText('Search documents...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    // Verify that getUserDocuments is called with search parameter
    await waitFor(() => {
      expect(documentService.getUserDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'John',
          page: 1,
          limit: 12
        })
      );
    });
  });

  test('handles status filter', async () => {
    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Degree')).toBeInTheDocument();
    });

    // Find and use status filter
    const statusSelect = screen.getByLabelText('Status');
    fireEvent.mouseDown(statusSelect);
    
    const verifiedOption = screen.getByText('Verified');
    fireEvent.click(verifiedOption);

    // Verify that getUserDocuments is called with status filter
    await waitFor(() => {
      expect(documentService.getUserDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'blockchain_stored',
          page: 1,
          limit: 12
        })
      );
    });
  });

  test('handles document type filter', async () => {
    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Degree')).toBeInTheDocument();
    });

    // Find and use type filter
    const typeSelect = screen.getByLabelText('Type');
    fireEvent.mouseDown(typeSelect);
    
    const degreeOption = screen.getByText('Degree');
    fireEvent.click(degreeOption);

    // Verify that getUserDocuments is called with type filter
    await waitFor(() => {
      expect(documentService.getUserDocuments).toHaveBeenCalledWith(
        expect.objectContaining({
          documentType: 'degree',
          page: 1,
          limit: 12
        })
      );
    });
  });

  test('opens document details dialog', async () => {
    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Degree')).toBeInTheDocument();
    });

    // Find and click view details button
    const viewButtons = screen.getAllByLabelText('View Details');
    fireEvent.click(viewButtons[0]);

    // Check if dialog opens
    await waitFor(() => {
      expect(screen.getByText('Document Details')).toBeInTheDocument();
    });
  });

  test('handles empty state', async () => {
    // Mock empty response
    documentService.getUserDocuments.mockResolvedValue({
      success: true,
      data: {
        documents: [],
        pagination: {
          current: 1,
          pages: 0,
          total: 0,
          limit: 12
        }
      }
    });

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('No documents found')).toBeInTheDocument();
      expect(screen.getByText('Upload your first document to get started')).toBeInTheDocument();
    });
  });

  test('handles API error', async () => {
    // Mock API error
    documentService.getUserDocuments.mockRejectedValue(new Error('API Error'));

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  test('displays correct status chips', async () => {
    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('BLOCKCHAIN_STORED')).toBeInTheDocument();
      expect(screen.getByText('UPLOADED')).toBeInTheDocument();
    });
  });

  test('shows verification count when available', async () => {
    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Verified 5 times')).toBeInTheDocument();
      expect(screen.getByText('Verified 2 times')).toBeInTheDocument();
    });
  });

  test('handles pagination', async () => {
    // Mock response with multiple pages
    documentService.getUserDocuments.mockResolvedValue({
      success: true,
      data: {
        documents: mockDocuments,
        pagination: {
          current: 1,
          pages: 3,
          total: 30,
          limit: 12
        }
      }
    });

    renderWithTheme(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Degree')).toBeInTheDocument();
    });

    // Check if pagination is rendered
    const pagination = screen.getByRole('navigation');
    expect(pagination).toBeInTheDocument();
  });
});