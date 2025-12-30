import React from 'react';
import { render, screen } from '@testing-library/react';
import DocumentUploadForm from './DocumentUploadForm';
import RegistrationProgress from './RegistrationProgress';
import QRCodeDisplay from './QRCodeDisplay';

describe('IssuerDashboard Components', () => {
  describe('DocumentUploadForm', () => {
    test('renders upload form', () => {
      const mockSubmit = jest.fn();
      render(<DocumentUploadForm onSubmit={mockSubmit} />);
      
      expect(screen.getByText('Register New Document')).toBeInTheDocument();
      expect(screen.getByText(/Upload and register academic documents/i)).toBeInTheDocument();
    });

    test('shows drag and drop area', () => {
      const mockSubmit = jest.fn();
      render(<DocumentUploadForm onSubmit={mockSubmit} />);
      
      expect(screen.getByText(/Drag & drop document here/i)).toBeInTheDocument();
    });
  });

  describe('RegistrationProgress', () => {
    test('renders progress component', () => {
      render(<RegistrationProgress status={null} error={null} />);
      
      expect(screen.getByText('Registration Progress')).toBeInTheDocument();
    });

    test('shows all registration steps', () => {
      render(<RegistrationProgress status={null} error={null} />);
      
      expect(screen.getByText('Computing Document Hash')).toBeInTheDocument();
      expect(screen.getByText('Encrypting Document')).toBeInTheDocument();
      expect(screen.getByText('Uploading to IPFS')).toBeInTheDocument();
      expect(screen.getByText('Blockchain Registration')).toBeInTheDocument();
      expect(screen.getByText('Generating QR Code')).toBeInTheDocument();
    });
  });

  describe('QRCodeDisplay', () => {
    test('renders nothing when no result provided', () => {
      const { container } = render(<QRCodeDisplay registrationResult={null} onClose={jest.fn()} />);
      
      expect(container.firstChild).toBeNull();
    });

    test('renders success message with valid result', () => {
      const mockResult = {
        success: true,
        data: {
          document: {
            documentHash: '0x1234567890abcdef',
            transactionId: '0xabcdef1234567890',
            metadata: {
              studentName: 'John Doe',
              studentId: '12345',
              institutionName: 'Test University',
              documentType: 'degree',
              issueDate: '2024-01-01',
            },
            blockchain: {
              transactionHash: '0xabcdef1234567890',
              blockNumber: 12345,
              gasUsed: 100000,
              explorerUrl: 'https://example.com/tx/0xabcdef1234567890',
            },
            ipfs: {
              cid: 'QmTest123',
              provider: 'web3.storage',
            },
            qrCode: {
              dataUrl: 'data:image/png;base64,test',
              verificationUrl: 'https://example.com/verify',
            },
          },
        },
      };

      render(<QRCodeDisplay registrationResult={mockResult} onClose={jest.fn()} />);
      
      expect(screen.getByText('Document Registered Successfully!')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });
  });
});
