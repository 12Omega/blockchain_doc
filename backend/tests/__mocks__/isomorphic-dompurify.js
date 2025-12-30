/**
 * Mock for isomorphic-dompurify to avoid ES module issues in Jest
 * This provides a simple sanitization function for testing
 */

const DOMPurify = {
  sanitize: (input, options = {}) => {
    if (typeof input !== 'string') {
      return input;
    }
    
    // Simple HTML tag removal for testing
    // In production, the real DOMPurify provides comprehensive XSS protection
    let sanitized = input;
    
    if (options.ALLOWED_TAGS && options.ALLOWED_TAGS.length === 0) {
      // Remove script tags and their content first (dangerous tags)
      sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      sanitized = sanitized.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
      sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
      
      // If KEEP_CONTENT is false, remove dangerous tags and their content
      if (options.KEEP_CONTENT === false) {
        // Only remove script/style/iframe content, keep other tag content
        // This is already done above
      }
      
      // Remove all remaining HTML tags but keep the text content
      sanitized = sanitized.replace(/<[^>]*>/g, '');
    }
    
    return sanitized;
  }
};

module.exports = DOMPurify;
