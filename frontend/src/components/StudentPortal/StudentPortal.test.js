import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import StudentPortal from './StudentPortal';
import documentService from '../../services/documentService';

// Mock the document service
jest.mock('../../services/documentService');

// Mock the child components
jest.mock('./MyDocuments', () => {
  return function MyDocuments() {
    return <div data-testid="my-documents">My Documents Component</div>;
  };
});

jest.mock('./AccessManagement', () => {
  return function AccessManagement() {
    return <div data-testid="access-management">Access Management Component</div>;
  };
});

jest.mock('./AccessLogs', () => {
  return function AccessLogs() {
    return <div data-testid="access-logs">Access Logs Component</div>;
  };
});

// Mock the auth context
const mockUser = {
  walletAddress: '0x1234567890123456789012345678901234567890',
  role: 'student',
  profile: { name: 'Test Student' }
};

const mockAuthContextAuthenticated = {
  user: mockUser,
  isAuthenticated: true,
};

const mockAuthContextNotAuthenticated = {
  user: null,
  isAuthenticated: false,
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: jest.fn(),
  AuthProvider: ({ children }) => children
}));

const theme = createTheme();

const renderWithTheme = (component) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('StudentPortal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders warning when user is not authenticated', () => {
    const { useAuth } = require('../../contexts/AuthContext');
    useAuth.mockReturnValue(mockAuthContextNotAuthenticated);

    renderWithTheme(<StudentPortal />);
    
    expect(screen.getByText(/Please connect your wallet/i)).toBeInTheDocument();
  });

  it('renders student portal when user is authenticated', async () => {
    const { useAuth } = require('../../contexts/AuthContext');
    useAuth.mockReturnValue(mockAuthContextAuthenticated);

    renderWithTheme(<StudentPortal />);
    
    await waitFor(() => {
      expect(screen.getByText('Student Portal')).toBeInTheDocument();
    });
  });

  it('renders all three tabs', async () => {
    const { useAuth } = require('../../contexts/AuthContext');
    useAuth.mockReturnValue(mockAuthContextAuthenticated);

    renderWithTheme(<StudentPortal />);
    
    await waitFor(() => {
      expect(screen.getByText('My Documents')).toBeInTheDocument();
      expect(screen.getByText('Access Management')).toBeInTheDocument();
      expect(screen.getByText('Access Logs')).toBeInTheDocument();
    });
  });

  it('displays My Documents tab by default', async () => {
    const { useAuth } = require('../../contexts/AuthContext');
    useAuth.mockReturnValue(mockAuthContextAuthenticated);

    renderWithTheme(<StudentPortal />);
    
    await waitFor(() => {
      expect(screen.getByTestId('my-documents')).toBeInTheDocument();
    });
  });
});
