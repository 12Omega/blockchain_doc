import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DocumentDetails from './DocumentDetails';

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock fetch
global.fetch = jest.fn();

const mockDocument = {
  _id: '1',
  documentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
  ipfsHash: 'QmTest123456789',
  metadata: {
    studentName: 'John Doe',
    studentId: 'STU001',
    institutionName: 'Test University',
    documentType: 'degree',
    issueDate: '2023-06-15T00:00:00.000Z',
    expiryDate: '2028-06-15T00:00:00.000Z',
    course: 'Computer Science',
    grade: 'First Class'
  },
  status: 'blockchain_stored',
  access: {
    owner: '0x1234567890123456789012345678901234567890',
    issuer: '0x2345678901234567890123456789012345678901',
    authorizedViewers: ['0x3456789012345678901234567890123456789012']
  },
  audit: {
    createdAt: '2023-06-15T10:00:00.000Z',
    verificationCount: 5
  },
  fileInfo: {
    originalName: 'degree.pdf',
    mimeType: 'application/pdf',
    size: 1024000
  },
  blockchain: {
    transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 12345,
    gasUsed: 150000
  }
};

const mockVerificationStatus = {
  isValid: true,
  documentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
  status: 'blockchain_stored',
  metadata: mockDocument.metadata,
  blockchain: {
    isValid: true,
    transactionHash: mockDocument.blockchain.transactionHash
  },
  audit: {
    verificationCount: 5,
    createdAt: '2023-06-15T10:00:00.000Z'
  }
};

const mockAuditTrail = {
  documentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
  events: [
    {
      type: 'document_created',
      timestamp: '2023-06-15T10:00:00.000Z',
      actor: '0x2345678901234567890123456789012345678901',
      details: {
        issuer: '0x2345678901234567890123456789012345678901',
        owner: '0x1234567890123456789012345678901234567890',
        documentType: 'degree'
      }
    },
    {
      type: 'ipfs_upload',
      timestamp: '2023-06-15T10:00:00.000Z',
      actor: '0x2345678901234567890123456789012345678901',
      details: {
        ipfsHash: 'QmTest123456789',
        fileSize: 1024000
      }
    },
    {
      type: 'blockchain_registered',
      timestamp: '2023-06-15T10:00:00.000Z',
      actor: '0x2345678901234567890123456789012345678901',
      details: {
        transactionHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        blockNumber: 12345,
        gasUsed: 150000
      }
    }
  ],
  statistics: {
    verificationCount: 5,
    age: 30,
    status: 'blockchain_stored'
  }
};

describe('DocumentDetails Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'mock-token');
    
    // Mock successful API responses
    fetch.mockImplementation((url) => {
      if (url.includes('/verify/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { verification: mockVerificationStatus }
          })
        });
      }
      if (url.includes('/audit/')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            data: { audit: mockAuditTrail }
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  test('renders document details correctly', async () => {
    renderWithTheme(<DocumentDetails document={mockDocument} />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Degree')).toBeInTheDocument();
    });

    // Check document information
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('STU001')).toBeInTheDocument();
    expect(screen.getByText('Test University')).toBeInTheDocument();
    expect(screen.getByText('Computer Science')).toBeInTheDocument();
    expect(screen.getByText('First Class')).toBeInTheDocument();

    // Check technical details
    expect(screen.getByText('Document Hash')).toBeInTheDocument();
    expect(screen.getByText('IPFS Hash')).toBeInTheDocument();
    expect(screen.getByText('degree.pdf')).toBeInTheDocument();
    expect(screen.getByText('1 MB')).toBeInTheDocument();
  });

  test('displays verification status', async () => {
    renderWithTheme(<DocumentDetails document={mockDocument} />);

    await waitFor(() => {
      expect(screen.getByText('Document is verified and authentic')).toBeInTheDocument();
    });
  });

  test('shows access control information', async () => {
    renderWithTheme(<DocumentDetails document={mockDocument} />);

    await waitFor(() => {
      expect(screen.getByText('Access Control')).toBeInTheDocument();
    });

    // Check owner and issuer addresses
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Issuer')).toBeInTheDocument();
    expect(screen.getByText('Authorized Viewers')).toBeInTheDocument();
  });

  test('displays blockchain details when available', async () => {
    renderWithTheme(<DocumentDetails document={mockDocument} />);

    await waitFor(() => {
      expect(screen.getByText('Blockchain Details')).toBeInTheDocument();
    });

    // Check if blockchain details are present
    expect(screen.getByText('Transaction Hash')).toBeInTheDocument();
    expect(screen.getByText('Block Number')).toBeInTheDocument();
    expect(screen.getByText('Gas Used')).toBeInTheDocument();
  });

  test('shows audit trail information', async () => {
    renderWithTheme(<DocumentDetails document={mockDocument} />);

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    // Check statistics
    expect(screen.getByText('Verification Count')).toBeInTheDocument();
    expect(screen.getByText('Age (days)')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
  });

  test('handles loading state', () => {
    // Mock slow API response
    fetch.mockImplementation(() => new Promise(() => {}));

    renderWithTheme(<DocumentDetails document={mockDocument} />);

    // Check if loading indicator is shown
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('handles API error', async () => {
    // Mock API error
    fetch.mockRejectedValue(new Error('API Error'));

    renderWithTheme(<DocumentDetails document={mockDocument} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load document details')).toBeInTheDocument();
    });
  });

  test('formats file size correctly', async () => {
    const documentWithLargeFile = {
      ...mockDocument,
      fileInfo: {
        ...mockDocument.fileInfo,
        size: 5242880 // 5MB
      }
    };

    renderWithTheme(<DocumentDetails document={documentWithLargeFile} />);

    await waitFor(() => {
      expect(screen.getByText('5 MB')).toBeInTheDocument();
    });
  });

  test('handles document without expiry date', async () => {
    const documentWithoutExpiry = {
      ...mockDocument,
      metadata: {
        ...mockDocument.metadata,
        expiryDate: undefined
      }
    };

    renderWithTheme(<DocumentDetails document={documentWithoutExpiry} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Expiry date should not be shown
    expect(screen.queryByText('Expiry Date')).not.toBeInTheDocument();
  });

  test('handles document without blockchain info', async () => {
    const documentWithoutBlockchain = {
      ...mockDocument,
      blockchain: {}
    };

    renderWithTheme(<DocumentDetails document={documentWithoutBlockchain} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Blockchain details should not be shown
    expect(screen.queryByText('Blockchain Details')).not.toBeInTheDocument();
  });

  test('displays correct status icon and color', async () => {
    renderWithTheme(<DocumentDetails document={mockDocument} />);

    await waitFor(() => {
      expect(screen.getByText('BLOCKCHAIN_STORED')).toBeInTheDocument();
    });
  });
});