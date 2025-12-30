import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
} from '@mui/material';
import {
  QrCodeScanner as QrCodeScannerIcon,
  Close as CloseIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { QrReader } from 'react-qr-reader';

const QRCodeVerification = ({ onVerify, loading }) => {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [manualHash, setManualHash] = useState('');
  const [scanError, setScanError] = useState(null);
  const [hashError, setHashError] = useState(null);
  const qrReaderRef = useRef(null);

  const validateDocumentHash = (hash) => {
    // Ethereum hash format: 0x followed by 64 hexadecimal characters
    const hashRegex = /^0x[a-fA-F0-9]{64}$/;
    return hashRegex.test(hash);
  };

  const handleScanResult = useCallback((result, error) => {
    if (result) {
      const scannedData = result.text;
      setScanError(null);
      
      // Try to extract document hash from scanned data
      let documentHash = null;
      
      try {
        // If it's a JSON string, parse it
        if (scannedData.startsWith('{')) {
          const parsed = JSON.parse(scannedData);
          documentHash = parsed.documentHash || parsed.hash;
        } 
        // If it looks like a hash directly
        else if (validateDocumentHash(scannedData)) {
          documentHash = scannedData;
        }
        // If it's a URL with hash parameter
        else if (scannedData.includes('hash=')) {
          const url = new URL(scannedData);
          documentHash = url.searchParams.get('hash');
        }
        
        if (documentHash && validateDocumentHash(documentHash)) {
          setScannerOpen(false);
          onVerify(documentHash);
        } else {
          setScanError('Invalid QR code. Please scan a valid document verification QR code.');
        }
      } catch (parseError) {
        setScanError('Unable to read QR code data. Please try again.');
      }
    }
    
    if (error) {
      console.warn('QR scan error:', error);
      // Don't show error for every scan attempt, only for actual failures
      if (error.name !== 'NotAllowedError') {
        setScanError('Camera access error. Please check permissions and try again.');
      }
    }
  }, [onVerify]);

  const handleManualVerify = () => {
    setHashError(null);
    
    if (!manualHash.trim()) {
      setHashError('Please enter a document hash');
      return;
    }
    
    if (!validateDocumentHash(manualHash.trim())) {
      setHashError('Invalid hash format. Hash should be 0x followed by 64 hexadecimal characters.');
      return;
    }
    
    onVerify(manualHash.trim());
  };

  const handleOpenScanner = () => {
    setScanError(null);
    setScannerOpen(true);
  };

  const handleCloseScanner = () => {
    setScannerOpen(false);
    setScanError(null);
  };

  const handleHashChange = (event) => {
    setManualHash(event.target.value);
    setHashError(null);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        QR Code & Hash Verification
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Scan a QR code from a verified document or manually enter a document hash
        to verify its authenticity on the blockchain.
      </Typography>

      {/* QR Code Scanner Section */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          QR Code Scanner
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Use your camera to scan a QR code from a verified document certificate.
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<QrCodeScannerIcon />}
          onClick={handleOpenScanner}
          disabled={loading}
          size="large"
        >
          Open QR Scanner
        </Button>

        {scanError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {scanError}
          </Alert>
        )}
      </Paper>

      <Divider sx={{ my: 2 }} />

      {/* Manual Hash Entry Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          Manual Hash Verification
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          If you have the document hash, you can enter it directly for verification.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <TextField
            fullWidth
            label="Document Hash"
            placeholder="0x..."
            value={manualHash}
            onChange={handleHashChange}
            error={!!hashError}
            helperText={hashError || 'Enter the 66-character document hash (0x + 64 hex characters)'}
            disabled={loading}
            variant="outlined"
          />
          <Button
            variant="contained"
            onClick={handleManualVerify}
            disabled={loading || !manualHash.trim()}
            startIcon={<SearchIcon />}
            sx={{ minWidth: 120, height: 56 }}
          >
            Verify
          </Button>
        </Box>
      </Paper>

      {/* QR Scanner Dialog */}
      <Dialog
        open={scannerOpen}
        onClose={handleCloseScanner}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Scan QR Code</Typography>
            <IconButton onClick={handleCloseScanner}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Typography variant="body2" color="text.secondary" paragraph>
            Position the QR code within the camera frame. Make sure the code is clear and well-lit.
          </Typography>
          
          {scannerOpen && (
            <Box sx={{ 
              width: '100%', 
              maxWidth: 400, 
              mx: 'auto',
              '& video': {
                width: '100%',
                height: 'auto',
                borderRadius: 1,
              }
            }}>
              <QrReader
                ref={qrReaderRef}
                onResult={handleScanResult}
                constraints={{
                  facingMode: 'environment' // Use back camera if available
                }}
                scanDelay={300}
                style={{ width: '100%' }}
              />
            </Box>
          )}

          {scanError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {scanError}
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseScanner}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          <strong>QR Code Format:</strong> The QR code should contain either a document hash directly,
          a JSON object with a documentHash field, or a URL with a hash parameter.
        </Typography>
      </Alert>
    </Box>
  );
};

export default QRCodeVerification;