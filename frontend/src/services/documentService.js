import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class DocumentService {
  constructor() {
    this.api = axios.create({
      baseURL: `${API_BASE_URL}/api`,
      timeout: 30000, // Longer timeout for file uploads
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle auth errors
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
        }
        return Promise.reject(error);
      }
    );
  }

  // Register document with complete flow
  async registerDocument(file, metadata, onProgress) {
    try {
      const formData = new FormData();
      formData.append('document', file);
      
      // Append metadata fields individually
      Object.keys(metadata).forEach(key => {
        if (metadata[key]) {
          formData.append(key, metadata[key]);
        }
      });

      const response = await this.api.post('/documents/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('Document registration error:', error);
      throw new Error(
        error.response?.data?.error || error.response?.data?.message || 'Failed to register document'
      );
    }
  }

  // Upload document with progress tracking
  async uploadDocument(file, metadata, onProgress) {
    try {
      const formData = new FormData();
      formData.append('document', file); // Changed from 'file' to 'document'
      formData.append('metadata', JSON.stringify(metadata));

      const response = await this.api.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress(percentCompleted);
          }
        },
      });

      return response.data;
    } catch (error) {
      console.error('Document upload error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to upload document'
      );
    }
  }

  // Verify document
  async verifyDocument(file) {
    try {
      const formData = new FormData();
      formData.append('document', file); // Changed from 'file' to 'document'

      const response = await this.api.post('/documents/verify', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      console.error('Document verification error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to verify document'
      );
    }
  }

  // Get user documents
  async getUserDocuments(params = {}) {
    try {
      const response = await this.api.get('/documents', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching user documents:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch documents'
      );
    }
  }

  // Get document by hash
  async getDocument(documentHash) {
    try {
      const response = await this.api.get(`/documents/${documentHash}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching document:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch document'
      );
    }
  }

  // Transfer document ownership
  async transferDocument(documentHash, newOwner, signature) {
    try {
      const response = await this.api.post('/documents/transfer', {
        documentHash,
        newOwner,
        signature,
      });

      return response.data;
    } catch (error) {
      console.error('Document transfer error:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to transfer document'
      );
    }
  }

  // Validate file before upload
  validateFile(file) {
    const errors = [];
    
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push('File size must be less than 10MB');
    }

    // Check file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      errors.push('File type not supported. Please upload PDF, DOC, DOCX, or image files.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate metadata
  validateMetadata(metadata) {
    const errors = [];

    if (!metadata.studentId || metadata.studentId.trim().length === 0) {
      errors.push('Student ID is required');
    }

    if (!metadata.studentName || metadata.studentName.trim().length === 0) {
      errors.push('Student name is required');
    }

    if (!metadata.institutionName || metadata.institutionName.trim().length === 0) {
      errors.push('Institution name is required');
    }

    if (!metadata.documentType || metadata.documentType.trim().length === 0) {
      errors.push('Document type is required');
    }

    if (!metadata.issueDate) {
      errors.push('Issue date is required');
    } else {
      const issueDate = new Date(metadata.issueDate);
      const today = new Date();
      if (issueDate > today) {
        errors.push('Issue date cannot be in the future');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Grant access to a document
  async grantAccess(documentHash, userAddress) {
    try {
      const response = await this.api.post(`/documents/${documentHash}/access/grant`, {
        userAddress
      });
      return response.data;
    } catch (error) {
      console.error('Error granting access:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to grant access'
      );
    }
  }

  // Revoke access from a document
  async revokeAccess(documentHash, userAddress) {
    try {
      const response = await this.api.post(`/documents/${documentHash}/access/revoke`, {
        userAddress
      });
      return response.data;
    } catch (error) {
      console.error('Error revoking access:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to revoke access'
      );
    }
  }

  // Get access logs for a document
  async getAccessLogs(documentHash, params = {}) {
    try {
      const response = await this.api.get(`/documents/${documentHash}/audit`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching access logs:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch access logs'
      );
    }
  }

  // Download document
  async downloadDocument(documentHash) {
    try {
      const response = await this.api.get(`/documents/${documentHash}/download`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error downloading document:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to download document'
      );
    }
  }
}

export default new DocumentService();