import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  Link,
  Chip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  ContentCopy as CopyIcon,
  OpenInNew as ExternalLinkIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

const QRCodeDisplay = ({ registrationResult, onClose }) => {
  const [copied, setCopied] = useState({});

  if (!registrationResult || !registrationResult.data) {
    return null;
  }

  const { document } = registrationResult.data;

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied({ ...copied, [key]: true });
    setTimeout(() => {
      setCopied({ ...copied, [key]: false });
    }, 2000);
  };

  const handleDownloadQR = () => {
    if (!document.qrCode || !document.qrCode.dataUrl) {
      return;
    }

    const link = window.document.createElement('a');
    link.href = document.qrCode.dataUrl;
    link.download = `qr-code-${document.metadata.studentId}.png`;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const formatHash = (hash) => {
    if (!hash) return '';
    return `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}`;
  };

  return (
    <Paper elevation={3} sx={{ p: 4 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" gutterBottom>
          Document Registered Successfully!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Your document has been securely registered on the blockchain
        </Typography>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* QR Code */}
      {document.qrCode && document.qrCode.dataUrl && (
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Verification QR Code
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Embed this QR code in the document for easy verification
          </Typography>
          <Box
            component="img"
            src={document.qrCode.dataUrl}
            alt="Document QR Code"
            sx={{
              width: 250,
              height: 250,
              border: '1px solid',
              borderColor: 'grey.300',
              borderRadius: 2,
              p: 2,
              bgcolor: 'white',
            }}
          />
          <Box sx={{ mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadQR}
            >
              Download QR Code
            </Button>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Document Information */}
      <Typography variant="h6" gutterBottom>
        Document Information
      </Typography>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Student Name:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {document.metadata.studentName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Student ID:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {document.metadata.studentId}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Document Type:
          </Typography>
          <Chip
            label={document.metadata.documentType.toUpperCase()}
            size="small"
            color="primary"
          />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Institution:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {document.metadata.institutionName}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Issue Date:
          </Typography>
          <Typography variant="body2" fontWeight="medium">
            {new Date(document.metadata.issueDate).toLocaleDateString()}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Blockchain Information */}
      <Typography variant="h6" gutterBottom>
        Blockchain Details
      </Typography>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Document Hash:
            </Typography>
            <Tooltip title={copied.hash ? 'Copied!' : 'Copy'}>
              <IconButton
                size="small"
                onClick={() => handleCopy(document.documentHash, 'hash')}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
            {formatHash(document.documentHash)}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Transaction Hash:
            </Typography>
            <Tooltip title={copied.tx ? 'Copied!' : 'Copy'}>
              <IconButton
                size="small"
                onClick={() => handleCopy(document.blockchain.transactionHash, 'tx')}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
            {formatHash(document.blockchain.transactionHash)}
          </Typography>
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              Block Number:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {document.blockchain.blockNumber}
            </Typography>
          </Box>
        </Box>

        {document.blockchain.explorerUrl && (
          <Box sx={{ mt: 2 }}>
            <Link
              href={document.blockchain.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              View on Blockchain Explorer
              <ExternalLinkIcon fontSize="small" />
            </Link>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* IPFS Information */}
      <Typography variant="h6" gutterBottom>
        Storage Details
      </Typography>
      <Box sx={{ mb: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              IPFS CID:
            </Typography>
            <Tooltip title={copied.ipfs ? 'Copied!' : 'Copy'}>
              <IconButton
                size="small"
                onClick={() => handleCopy(document.ipfs.cid, 'ipfs')}
              >
                <CopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
            {document.ipfs.cid}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Storage Provider:
          </Typography>
          <Chip label={document.ipfs.provider} size="small" />
        </Box>
      </Box>

      {/* Verification URL */}
      {document.qrCode && document.qrCode.verificationUrl && (
        <>
          <Divider sx={{ my: 3 }} />
          <Box>
            <Typography variant="h6" gutterBottom>
              Verification URL
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  flex: 1,
                  p: 1,
                  bgcolor: 'grey.100',
                  borderRadius: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  wordBreak: 'break-all',
                }}
              >
                {document.qrCode.verificationUrl}
              </Typography>
              <Tooltip title={copied.url ? 'Copied!' : 'Copy URL'}>
                <IconButton
                  onClick={() => handleCopy(document.qrCode.verificationUrl, 'url')}
                >
                  <CopyIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </>
      )}

      {/* Action Buttons */}
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <Button variant="contained" onClick={onClose}>
          Register Another Document
        </Button>
      </Box>
    </Paper>
  );
};

export default QRCodeDisplay;
