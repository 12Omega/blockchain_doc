// Demo data generator for testing the role-based system

export const generateDemoStudent = () => ({
  id: 'demo-student-' + Date.now(),
  walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
  role: 'student',
  profile: {
    name: 'John Doe',
    email: 'john.doe@university.edu',
    organization: 'Demo University',
    department: 'Computer Science'
  },
  permissions: {
    canIssue: false,
    canVerify: true,
    canTransfer: false
  }
});

export const generateDemoAdmin = () => ({
  id: 'demo-admin-' + Date.now(),
  walletAddress: '0x' + Math.random().toString(16).substr(2, 40),
  role: 'admin',
  profile: {
    name: 'Dr. Jane Smith',
    email: 'jane.smith@university.edu',
    organization: 'Demo University',
    department: 'Administration'
  },
  permissions: {
    canIssue: true,
    canVerify: true,
    canTransfer: true
  }
});

export const generateDemoDocuments = (count = 3) => {
  const documentTypes = ['certificate', 'degree', 'transcript', 'diploma'];
  const documents = [];

  for (let i = 0; i < count; i++) {
    documents.push({
      id: 'demo-doc-' + Date.now() + '-' + i,
      filename: `document-${i + 1}.pdf`,
      originalName: `Demo ${documentTypes[i % documentTypes.length]} ${i + 1}.pdf`,
      hash: '0x' + Math.random().toString(16).substr(2, 64),
      metadata: {
        title: `Demo ${documentTypes[i % documentTypes.length]} ${i + 1}`,
        studentName: 'John Doe',
        description: `This is a demo ${documentTypes[i % documentTypes.length]} for testing purposes`,
        documentType: documentTypes[i % documentTypes.length]
      },
      fileSize: Math.floor(Math.random() * 5000000) + 100000, // 100KB to 5MB
      uploadDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      encrypted: true,
      blockchainVerified: true,
      ipfsHash: 'Qm' + Math.random().toString(36).substr(2, 44),
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
      qrCode: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    });
  }

  return documents;
};