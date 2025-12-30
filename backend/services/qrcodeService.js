const QRCode = require('qrcode');
const logger = require('../utils/logger');

class QRCodeService {
  constructor() {
    this.baseVerificationUrl = process.env.VERIFICATION_URL || 'http://localhost:3000/verify';
  }

  /**
   * Generate QR code for document verification
   * @param {string} documentHash - Document hash with 0x prefix
   * @param {string} transactionHash - Blockchain transaction hash
   * @returns {Promise<Object>} QR code data URL and verification URL
   */
  async generateQRCode(documentHash, transactionHash) {
    try {
      if (!documentHash || !transactionHash) {
        throw new Error('Document hash and transaction hash are required');
      }

      // Create verification URL with embedded parameters
      const verificationUrl = `${this.baseVerificationUrl}?hash=${documentHash}&tx=${transactionHash}`;

      // Generate QR code as data URL (base64 encoded PNG)
      const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      logger.debug('QR code generated successfully', {
        documentHash,
        transactionHash
      });

      return {
        qrCodeDataUrl,
        verificationUrl,
        documentHash,
        transactionHash
      };

    } catch (error) {
      logger.error('QR code generation failed:', {
        error: error.message,
        documentHash,
        transactionHash
      });
      throw new Error(`QR code generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code as buffer
   * @param {string} documentHash - Document hash
   * @param {string} transactionHash - Transaction hash
   * @param {string} format - Format: 'png' or 'svg' (default: 'png')
   * @returns {Promise<Buffer|string>} QR code PNG buffer or SVG string
   */
  async generateQRCodeBuffer(documentHash, transactionHash, format = 'png') {
    try {
      const verificationUrl = `${this.baseVerificationUrl}?hash=${documentHash}&tx=${transactionHash}`;

      if (format === 'svg') {
        // Generate SVG format
        const svg = await QRCode.toString(verificationUrl, {
          errorCorrectionLevel: 'H',
          type: 'svg',
          margin: 1,
          width: 300
        });
        return svg;
      } else {
        // Generate PNG format
        const buffer = await QRCode.toBuffer(verificationUrl, {
          errorCorrectionLevel: 'H',
          type: 'png',
          quality: 0.95,
          margin: 1,
          width: 300
        });
        return buffer;
      }

    } catch (error) {
      logger.error('QR code buffer generation failed:', error);
      throw new Error(`QR code buffer generation failed: ${error.message}`);
    }
  }

  /**
   * Generate QR code in SVG format
   * @param {string} documentHash - Document hash
   * @param {string} transactionHash - Transaction hash
   * @returns {Promise<string>} QR code SVG string
   */
  async generateQRCodeSVG(documentHash, transactionHash) {
    try {
      if (!documentHash || !transactionHash) {
        throw new Error('Document hash and transaction hash are required');
      }

      const verificationUrl = `${this.baseVerificationUrl}?hash=${documentHash}&tx=${transactionHash}`;

      const svg = await QRCode.toString(verificationUrl, {
        errorCorrectionLevel: 'H',
        type: 'svg',
        margin: 1,
        width: 300,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      logger.debug('QR code SVG generated successfully', {
        documentHash,
        transactionHash
      });

      return {
        qrCodeSVG: svg,
        verificationUrl,
        documentHash,
        transactionHash
      };

    } catch (error) {
      logger.error('QR code SVG generation failed:', {
        error: error.message,
        documentHash,
        transactionHash
      });
      throw new Error(`QR code SVG generation failed: ${error.message}`);
    }
  }

  /**
   * Parse QR code data to extract document hash and transaction hash
   * @param {string} qrCodeData - QR code data (URL)
   * @returns {Object} Parsed document hash and transaction hash
   */
  parseQRCode(qrCodeData) {
    try {
      const url = new URL(qrCodeData);
      const documentHash = url.searchParams.get('hash');
      const transactionHash = url.searchParams.get('tx');

      if (!documentHash || !transactionHash) {
        throw new Error('Invalid QR code format: missing hash or transaction');
      }

      return {
        documentHash,
        transactionHash
      };

    } catch (error) {
      logger.error('QR code parsing failed:', error);
      throw new Error(`QR code parsing failed: ${error.message}`);
    }
  }

  /**
   * Validate QR code URL format
   * @param {string} url - URL to validate
   * @returns {boolean} True if valid
   */
  isValidQRCodeUrl(url) {
    try {
      const parsedUrl = new URL(url);
      const hash = parsedUrl.searchParams.get('hash');
      const tx = parsedUrl.searchParams.get('tx');

      return !!(hash && tx && 
                /^0x[a-fA-F0-9]{64}$/.test(hash) && 
                /^0x[a-fA-F0-9]{64}$/.test(tx));
    } catch (error) {
      return false;
    }
  }
}

module.exports = new QRCodeService();
