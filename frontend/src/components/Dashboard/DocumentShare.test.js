import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import DocumentShare from './DocumentShare';

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

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(() => Promise.resolve()),
  },
});

const mockDocument = {
  _id: '1',
  documentHash: '0x1234567890123456789012345678901234567890123456789012345678901234',
  ipfsHash: 'QmTest123456789',
  metadata: {
    studentName: 'John Doe',
    studentId: 'STU001',
    institutionName: 'Test University',
    documentType: 'degree',
    issueDate: '2023-06-15T00:00:00.000Z'
  },
  status: 'blockchain_stored',
  access: {
    owner: '0x1234567890123456789012345678901234567890',
    issuer: '0x2345678901234567890123456789012345678901',
    authorizedViewers: ['0x3456789012345678901234567890123456789012']
  }
};

const mockOnClose = jest.fn();

describe('DocumentShare Component', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn(() => 'mock-token');
    
    // Mock successful API responses
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { message: 'Access granted successfully' }
      })
    });
  });

  test('renders document share interface', () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Check header
    expect(screen.getByText('Share: Degree')).toBeInTheDocument();
    expect(screen.getByText('John Doe - Test University')).toBeInTheDocument();

    // Check quick share options
    expect(screen.getByText('Quick Share')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
    expect(screen.getByText('QR Code')).toBeInTheDocument();

    // Check access management
    expect(screen.getByText('Grant Access to Wallet')).toBeInTheDocument();
    expect(screen.getByText('Current Access')).toBeInTheDocument();
  });

  test('displays current access list', () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Check owner
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('0x1234...7890')).toBeInTheDocument();

    // Check issuer
    expect(screen.getByText('Issuer')).toBeInTheDocument();
    expect(screen.getByText('0x2345...8901')).toBeInTheDocument();

    // Check authorized viewer
    expect(screen.getByText('Viewer')).toBeInTheDocument();
    expect(screen.getByText('0x3456...9012')).toBeInTheDocument();
  });

  test('handles adding new viewer', async () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Find input field and enter address
    const addressInput = screen.getByPlaceholderText('0x...');
    fireEvent.change(addressInput, { 
      target: { value: '0x4567890123456789012345678901234567890123' } 
    });

    // Click grant button
    const grantButton = screen.getByText('Grant');
    fireEvent.click(grantButton);

    // Wait for API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/documents/${mockDocument.documentHash}/share`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }),
          body: JSON.stringify({
            viewerAddress: '0x4567890123456789012345678901234567890123',
            accessLevel: 'view'
          })
        })
      );
    });

    // Check success message
    await waitFor(() => {
      expect(screen.getByText('Access granted successfully')).toBeInTheDocument();
    });
  });

  test('validates wallet address format', async () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Enter invalid address
    const addressInput = screen.getByPlaceholderText('0x...');
    fireEvent.change(addressInput, { target: { value: 'invalid-address' } });

    // Click grant button
    const grantButton = screen.getByText('Grant');
    fireEvent.click(grantButton);

    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Invalid Ethereum address format')).toBeInTheDocument();
    });

    // Ensure no API call was made
    expect(fetch).not.toHaveBeenCalled();
  });

  test('handles empty address input', async () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Click grant button without entering address
    const grantButton = screen.getByText('Grant');
    fireEvent.click(grantButton);

    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Please enter a valid wallet address')).toBeInTheDocument();
    });
  });

  test('handles access level selection', () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Find access level select
    const accessLevelSelect = screen.getByLabelText('Access Level');
    fireEvent.mouseDown(accessLevelSelect);

    // Check options
    expect(screen.getByText('View Only')).toBeInTheDocument();
    expect(screen.getByText('View & Download')).toBeInTheDocument();

    // Select download option
    fireEvent.click(screen.getByText('View & Download'));
  });

  test('handles removing viewer', async () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Find delete button for authorized viewer
    const deleteButtons = screen.getAllByLabelText('delete');
    fireEvent.click(deleteButtons[0]);

    // Wait for API call
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        `/api/documents/${mockDocument.documentHash}/share`,
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token'
          }),
          body: JSON.stringify({
            viewerAddress: '0x3456789012345678901234567890123456789012'
          })
        })
      );
    });
  });

  test('copies shareable link to clipboard', async () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Click copy link button
    const copyLinkButton = screen.getByText('Copy Link');
    fireEvent.click(copyLinkButton);

    // Check clipboard was called
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/verify?hash=${mockDocument.documentHash}`
      );
    });

    // Check success message
    expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
  });

  test('opens QR code dialog', async () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Click QR code button
    const qrButton = screen.getByText('QR Code');
    fireEvent.click(qrButton);

    // Check if dialog opens
    await waitFor(() => {
      expect(screen.getByText('Document Verification QR Code')).toBeInTheDocument();
    });

    // Check if shareable link is displayed
    expect(screen.getByDisplayValue(
      `${window.location.origin}/verify?hash=${mockDocument.documentHash}`
    )).toBeInTheDocument();
  });

  test('handles API error when granting access', async () => {
    // Mock API error
    fetch.mockRejectedValue(new Error('API Error'));

    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Enter valid address
    const addressInput = screen.getByPlaceholderText('0x...');
    fireEvent.change(addressInput, { 
      target: { value: '0x4567890123456789012345678901234567890123' } 
    });

    // Click grant button
    const grantButton = screen.getByText('Grant');
    fireEvent.click(grantButton);

    // Check error message
    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  test('handles API error when revoking access', async () => {
    // Mock API error
    fetch.mockRejectedValue(new Error('Revoke Error'));

    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Find delete button for authorized viewer
    const deleteButtons = screen.getAllByLabelText('delete');
    fireEvent.click(deleteButtons[0]);

    // Check error message
    await waitFor(() => {
      expect(screen.getByText('Revoke Error')).toBeInTheDocument();
    });
  });

  test('displays sharing instructions', () => {
    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    expect(screen.getByText('Sharing Instructions')).toBeInTheDocument();
    expect(screen.getByText(/Link Sharing:/)).toBeInTheDocument();
    expect(screen.getByText(/Wallet Access:/)).toBeInTheDocument();
    expect(screen.getByText(/QR Code:/)).toBeInTheDocument();
  });

  test('handles document without authorized viewers', () => {
    const documentWithoutViewers = {
      ...mockDocument,
      access: {
        ...mockDocument.access,
        authorizedViewers: []
      }
    };

    renderWithTheme(<DocumentShare document={documentWithoutViewers} onClose={mockOnClose} />);

    expect(screen.getByText('No additional viewers have been granted access')).toBeInTheDocument();
  });

  test('disables grant button when loading', async () => {
    // Mock slow API response
    fetch.mockImplementation(() => new Promise(() => {}));

    renderWithTheme(<DocumentShare document={mockDocument} onClose={mockOnClose} />);

    // Enter valid address
    const addressInput = screen.getByPlaceholderText('0x...');
    fireEvent.change(addressInput, { 
      target: { value: '0x4567890123456789012345678901234567890123' } 
    });

    // Click grant button
    const grantButton = screen.getByText('Grant');
    fireEvent.click(grantButton);

    // Check if button is disabled and shows loading
    await waitFor(() => {
      expect(grantButton).toBeDisabled();
    });
  });
});