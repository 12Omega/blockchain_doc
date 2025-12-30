import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import QRCodeVerification from './QRCodeVerification';

// Mock the QR reader component
jest.mock('react-qr-reader', () => ({
  QrReader: ({ onResult }) => {
    return (
      <div data-testid="qr-reader">
        <button 
          onClick={() => onResult({ text: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' })}
        >
          Simulate QR Scan
        </button>
        <button 
          onClick={() => onResult({ text: 'invalid-qr-data' })}
        >
          Simulate Invalid QR
        </button>
        <button 
          onClick={() => onResult(null, new Error('Camera error'))}
        >
          Simulate Error
        </button>
      </div>
    );
  }
}));

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('QRCodeVerification', () => {
  const mockOnVerify = jest.fn();
  const validHash = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders QR code and manual verification sections', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    expect(screen.getByText('QR Code & Hash Verification')).toBeInTheDocument();
    expect(screen.getByText('QR Code Scanner')).toBeInTheDocument();
    expect(screen.getByText('Manual Hash Verification')).toBeInTheDocument();
    expect(screen.getByText('Open QR Scanner')).toBeInTheDocument();
    expect(screen.getByLabelText('Document Hash')).toBeInTheDocument();
  });

  it('opens QR scanner dialog', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    fireEvent.click(screen.getByText('Open QR Scanner'));
    
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    expect(screen.getByTestId('qr-reader')).toBeInTheDocument();
  });

  it('closes QR scanner dialog', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    fireEvent.click(screen.getByText('Open QR Scanner'));
    expect(screen.getByText('Scan QR Code')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Scan QR Code')).not.toBeInTheDocument();
  });

  it('handles successful QR code scan with valid hash', async () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    fireEvent.click(screen.getByText('Open QR Scanner'));
    fireEvent.click(screen.getByText('Simulate QR Scan'));
    
    await waitFor(() => {
      expect(mockOnVerify).toHaveBeenCalledWith(validHash);
    });
    
    // Dialog should close after successful scan
    expect(screen.queryByText('Scan QR Code')).not.toBeInTheDocument();
  });

  it('handles QR code scan with JSON data', async () => {
    // Mock QR reader to return JSON data
    jest.doMock('react-qr-reader', () => ({
      QrReader: ({ onResult }) => {
        return (
          <div data-testid="qr-reader">
            <button 
              onClick={() => onResult({ text: JSON.stringify({ documentHash: validHash }) })}
            >
              Simulate JSON QR Scan
            </button>
          </div>
        );
      }
    }));

    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    fireEvent.click(screen.getByText('Open QR Scanner'));
    fireEvent.click(screen.getByText('Simulate JSON QR Scan'));
    
    await waitFor(() => {
      expect(mockOnVerify).toHaveBeenCalledWith(validHash);
    });
  });

  it('handles QR code scan with URL containing hash parameter', async () => {
    const urlWithHash = `https://example.com/verify?hash=${validHash}`;
    
    // Mock QR reader to return URL data
    jest.doMock('react-qr-reader', () => ({
      QrReader: ({ onResult }) => {
        return (
          <div data-testid="qr-reader">
            <button 
              onClick={() => onResult({ text: urlWithHash })}
            >
              Simulate URL QR Scan
            </button>
          </div>
        );
      }
    }));

    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    fireEvent.click(screen.getByText('Open QR Scanner'));
    fireEvent.click(screen.getByText('Simulate URL QR Scan'));
    
    await waitFor(() => {
      expect(mockOnVerify).toHaveBeenCalledWith(validHash);
    });
  });

  it('shows error for invalid QR code data', async () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    fireEvent.click(screen.getByText('Open QR Scanner'));
    fireEvent.click(screen.getByText('Simulate Invalid QR'));
    
    await waitFor(() => {
      expect(screen.getByText(/invalid qr code/i)).toBeInTheDocument();
    });
    
    expect(mockOnVerify).not.toHaveBeenCalled();
  });

  it('handles camera errors', async () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    fireEvent.click(screen.getByText('Open QR Scanner'));
    fireEvent.click(screen.getByText('Simulate Error'));
    
    await waitFor(() => {
      expect(screen.getByText(/camera access error/i)).toBeInTheDocument();
    });
  });

  it('handles manual hash input and verification', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    const hashInput = screen.getByLabelText('Document Hash');
    fireEvent.change(hashInput, { target: { value: validHash } });
    
    fireEvent.click(screen.getByText('Verify'));
    
    expect(mockOnVerify).toHaveBeenCalledWith(validHash);
  });

  it('validates manual hash input format', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    const hashInput = screen.getByLabelText('Document Hash');
    fireEvent.change(hashInput, { target: { value: 'invalid-hash' } });
    
    fireEvent.click(screen.getByText('Verify'));
    
    expect(screen.getByText(/invalid hash format/i)).toBeInTheDocument();
    expect(mockOnVerify).not.toHaveBeenCalled();
  });

  it('shows error for empty hash input', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    fireEvent.click(screen.getByText('Verify'));
    
    expect(screen.getByText(/please enter a document hash/i)).toBeInTheDocument();
    expect(mockOnVerify).not.toHaveBeenCalled();
  });

  it('clears hash error when user types', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    // Trigger error first
    fireEvent.click(screen.getByText('Verify'));
    expect(screen.getByText(/please enter a document hash/i)).toBeInTheDocument();
    
    // Type in input
    const hashInput = screen.getByLabelText('Document Hash');
    fireEvent.change(hashInput, { target: { value: 'some-text' } });
    
    expect(screen.queryByText(/please enter a document hash/i)).not.toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={true} />);
    
    expect(screen.getByText('Open QR Scanner')).toBeDisabled();
    expect(screen.getByText('Verify')).toBeDisabled();
  });

  it('disables verify button when hash input is empty', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    expect(screen.getByText('Verify')).toBeDisabled();
    
    const hashInput = screen.getByLabelText('Document Hash');
    fireEvent.change(hashInput, { target: { value: validHash } });
    
    expect(screen.getByText('Verify')).not.toBeDisabled();
  });

  it('shows informational alert about QR code format', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    expect(screen.getByText(/qr code format/i)).toBeInTheDocument();
    expect(screen.getByText(/json object with a documenthash field/i)).toBeInTheDocument();
  });

  it('validates hash format correctly', () => {
    renderWithTheme(<QRCodeVerification onVerify={mockOnVerify} loading={false} />);
    
    const testCases = [
      { hash: validHash, shouldBeValid: true },
      { hash: '0x123', shouldBeValid: false }, // too short
      { hash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef', shouldBeValid: false }, // no 0x prefix
      { hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdefg', shouldBeValid: false }, // invalid character
      { hash: '', shouldBeValid: false }, // empty
    ];

    testCases.forEach(({ hash, shouldBeValid }) => {
      const hashInput = screen.getByLabelText('Document Hash');
      fireEvent.change(hashInput, { target: { value: hash } });
      
      if (hash) {
        fireEvent.click(screen.getByText('Verify'));
        
        if (shouldBeValid) {
          expect(mockOnVerify).toHaveBeenCalledWith(hash);
        } else {
          expect(screen.getByText(/invalid hash format/i)).toBeInTheDocument();
        }
      }
      
      // Clear for next test
      fireEvent.change(hashInput, { target: { value: '' } });
      jest.clearAllMocks();
    });
  });
});