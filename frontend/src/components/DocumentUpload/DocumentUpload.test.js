import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DocumentUpload from './DocumentUpload';
import documentService from '../../services/documentService';

// Mock the document service
jest.mock('../../services/documentService', () => ({
  validateFile: jest.fn(),
  validateMetadata: jest.fn(),
  uploadDocument: jest.fn()
}));

// Mock react-dropzone to avoid JSDOM compatibility issues
const mockGetRootProps = jest.fn(() => ({ 'data-testid': 'dropzone' }));
const mockGetInputProps = jest.fn(() => ({ 'data-testid': 'file-input' }));

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: mockGetRootProps,
    getInputProps: mockGetInputProps,
    isDragActive: false
  }))
}));

// Mock file for testing
const createMockFile = (name = 'test.pdf', size = 1024, type = 'application/pdf') => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('DocumentUpload Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    documentService.validateFile.mockReturnValue({
      isValid: true,
      errors: []
    });
    
    documentService.validateMetadata.mockReturnValue({
      isValid: true,
      errors: []
    });
  });

  test('renders upload interface correctly', () => {
    render(<DocumentUpload />);
    
    expect(screen.getByText('Upload Document')).toBeInTheDocument();
    expect(screen.getByText(/Drag & drop a file here/)).toBeInTheDocument();
    expect(screen.getByText('Document Information')).toBeInTheDocument();
    expect(screen.getByLabelText('Student ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Student Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Institution Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Document Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Issue Date')).toBeInTheDocument();
  });

  test('handles file selection via drag and drop', async () => {
    render(<DocumentUpload />);
    
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile();
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });
    
    expect(screen.getByText('1 KB')).toBeInTheDocument();
  });

  test('shows validation errors for invalid files', async () => {
    documentService.validateFile.mockReturnValue({
      isValid: false,
      errors: ['File size must be less than 10MB', 'File type not supported']
    });

    render(<DocumentUpload />);
    
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile('large.txt', 15 * 1024 * 1024, 'text/plain');
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
    });
    
    expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument();
    expect(screen.getByText('File type not supported')).toBeInTheDocument();
  });

  test('allows file removal', async () => {
    const user = userEvent.setup();
    render(<DocumentUpload />);
    
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile();
    
    // Add file
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await waitFor(() => {
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    // Remove file
    const removeButton = screen.getByRole('button', { name: /close/i });
    await user.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
    });
    
    expect(screen.getByText(/Drag & drop a file here/)).toBeInTheDocument();
  });

  test('validates form before upload', async () => {
    const user = userEvent.setup();
    render(<DocumentUpload />);
    
    const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
    
    // Try to upload without file or metadata
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Please select a file to upload')).toBeInTheDocument();
  });

  test('validates metadata fields', async () => {
    const user = userEvent.setup();
    
    documentService.validateMetadata.mockReturnValue({
      isValid: false,
      errors: [
        'Student ID is required',
        'Student name is required',
        'Institution name is required',
        'Document type is required',
        'Issue date is required'
      ]
    });

    render(<DocumentUpload />);
    
    // Add a file
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile();
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    // Try to upload
    const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Student ID is required')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Student name is required')).toBeInTheDocument();
    expect(screen.getByText('Institution name is required')).toBeInTheDocument();
    expect(screen.getByText('Document type is required')).toBeInTheDocument();
    expect(screen.getByText('Issue date is required')).toBeInTheDocument();
  });

  test('fills out form fields correctly', async () => {
    const user = userEvent.setup();
    render(<DocumentUpload />);
    
    // Fill out form fields
    await user.type(screen.getByLabelText('Student ID'), 'STU001');
    await user.type(screen.getByLabelText('Student Name'), 'John Doe');
    await user.type(screen.getByLabelText('Institution Name'), 'Test University');
    
    // Select document type
    await user.click(screen.getByLabelText('Document Type'));
    await user.click(screen.getByText('Degree Certificate'));
    
    await user.type(screen.getByLabelText('Issue Date'), '2023-12-01');
    await user.type(screen.getByLabelText('Department (Optional)'), 'Computer Science');
    await user.type(screen.getByLabelText('Description (Optional)'), 'Bachelor degree certificate');

    expect(screen.getByDisplayValue('STU001')).toBeInTheDocument();
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test University')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2023-12-01')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Computer Science')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Bachelor degree certificate')).toBeInTheDocument();
  });

  test('handles successful upload', async () => {
    const user = userEvent.setup();
    const mockUploadResult = {
      documentHash: '0x123456789abcdef',
      transactionHash: '0xabcdef123456789',
      ipfsHash: 'QmTest123456789',
      gasUsed: 150000
    };

    documentService.uploadDocument.mockResolvedValue(mockUploadResult);

    render(<DocumentUpload />);
    
    // Add file
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile();
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    // Fill required fields
    await user.type(screen.getByLabelText('Student ID'), 'STU001');
    await user.type(screen.getByLabelText('Student Name'), 'John Doe');
    await user.type(screen.getByLabelText('Institution Name'), 'Test University');
    await user.click(screen.getByLabelText('Document Type'));
    await user.click(screen.getByText('Degree Certificate'));
    await user.type(screen.getByLabelText('Issue Date'), '2023-12-01');

    // Upload
    const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
    await user.click(uploadButton);

    // Check upload progress
    await waitFor(() => {
      expect(screen.getByText(/Uploading.../)).toBeInTheDocument();
    });

    // Check success dialog
    await waitFor(() => {
      expect(screen.getByText('Document Uploaded Successfully')).toBeInTheDocument();
    });
    
    expect(screen.getByText('0x123456789abcdef')).toBeInTheDocument();
    expect(screen.getByText('0xabcdef123456789')).toBeInTheDocument();
    expect(screen.getByText('QmTest123456789')).toBeInTheDocument();
    expect(screen.getByText('150000')).toBeInTheDocument();

    // Verify service was called with correct parameters
    expect(documentService.uploadDocument).toHaveBeenCalledWith(
      file,
      {
        studentId: 'STU001',
        studentName: 'John Doe',
        institutionName: 'Test University',
        documentType: 'Degree Certificate',
        issueDate: '2023-12-01',
        expiryDate: '',
        department: '',
        description: ''
      },
      expect.any(Function)
    );
  });

  test('handles upload error', async () => {
    const user = userEvent.setup();
    const errorMessage = 'Upload failed: Network error';
    
    documentService.uploadDocument.mockRejectedValue(new Error(errorMessage));

    render(<DocumentUpload />);
    
    // Add file and fill form
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile();
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await user.type(screen.getByLabelText('Student ID'), 'STU001');
    await user.type(screen.getByLabelText('Student Name'), 'John Doe');
    await user.type(screen.getByLabelText('Institution Name'), 'Test University');
    await user.click(screen.getByLabelText('Document Type'));
    await user.click(screen.getByText('Degree Certificate'));
    await user.type(screen.getByLabelText('Issue Date'), '2023-12-01');

    // Upload
    const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  test('tracks upload progress', async () => {
    const user = userEvent.setup();
    let progressCallback;
    
    documentService.uploadDocument.mockImplementation((file, metadata, onProgress) => {
      progressCallback = onProgress;
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            documentHash: '0x123456789abcdef',
            transactionHash: '0xabcdef123456789',
            ipfsHash: 'QmTest123456789'
          });
        }, 100);
      });
    });

    render(<DocumentUpload />);
    
    // Add file and fill form
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile();
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await user.type(screen.getByLabelText('Student ID'), 'STU001');
    await user.type(screen.getByLabelText('Student Name'), 'John Doe');
    await user.type(screen.getByLabelText('Institution Name'), 'Test University');
    await user.click(screen.getByLabelText('Document Type'));
    await user.click(screen.getByText('Degree Certificate'));
    await user.type(screen.getByLabelText('Issue Date'), '2023-12-01');

    // Start upload
    const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
    await user.click(uploadButton);

    // Simulate progress updates
    progressCallback(25);
    expect(screen.getByText('Uploading... 25%')).toBeInTheDocument();

    progressCallback(75);
    expect(screen.getByText('Uploading... 75%')).toBeInTheDocument();
  });

  test('disables form during upload', async () => {
    const user = userEvent.setup();
    
    documentService.uploadDocument.mockImplementation(() => {
      return new Promise(() => {}); // Never resolves to keep upload state
    });

    render(<DocumentUpload />);
    
    // Add file and fill form
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile();
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await user.type(screen.getByLabelText('Student ID'), 'STU001');
    await user.type(screen.getByLabelText('Student Name'), 'John Doe');
    await user.type(screen.getByLabelText('Institution Name'), 'Test University');
    await user.click(screen.getByLabelText('Document Type'));
    await user.click(screen.getByText('Degree Certificate'));
    await user.type(screen.getByLabelText('Issue Date'), '2023-12-01');

    // Start upload
    const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText(/Uploading.../)).toBeInTheDocument();
    });

    // Check that form fields are disabled
    expect(screen.getByLabelText('Student ID')).toBeDisabled();
    expect(screen.getByLabelText('Student Name')).toBeDisabled();
    expect(screen.getByLabelText('Institution Name')).toBeDisabled();
    expect(screen.getByLabelText('Document Type')).toBeDisabled();
    expect(screen.getByLabelText('Issue Date')).toBeDisabled();
  });

  test('resets form after successful upload', async () => {
    const user = userEvent.setup();
    const mockUploadResult = {
      documentHash: '0x123456789abcdef',
      transactionHash: '0xabcdef123456789',
      ipfsHash: 'QmTest123456789'
    };

    documentService.uploadDocument.mockResolvedValue(mockUploadResult);

    render(<DocumentUpload />);
    
    // Add file and fill form
    const dropzone = screen.getByTestId('dropzone');
    const file = createMockFile();
    
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file]
      }
    });

    await user.type(screen.getByLabelText('Student ID'), 'STU001');
    await user.type(screen.getByLabelText('Student Name'), 'John Doe');
    await user.type(screen.getByLabelText('Institution Name'), 'Test University');
    await user.click(screen.getByLabelText('Document Type'));
    await user.click(screen.getByText('Degree Certificate'));
    await user.type(screen.getByLabelText('Issue Date'), '2023-12-01');

    // Upload
    const uploadButton = screen.getByRole('button', { name: /Upload Document/i });
    await user.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Document Uploaded Successfully')).toBeInTheDocument();
    });

    // Close success dialog
    const closeButton = screen.getByRole('button', { name: /Close/i });
    await user.click(closeButton);

    // Check that form is reset
    await waitFor(() => {
      expect(screen.getByText(/Drag & drop a file here/)).toBeInTheDocument();
    });
    
    expect(screen.getByLabelText('Student ID')).toHaveValue('');
    expect(screen.getByLabelText('Student Name')).toHaveValue('');
    expect(screen.getByLabelText('Institution Name')).toHaveValue('');
  });
});