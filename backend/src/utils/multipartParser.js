const { Buffer } = require('buffer');

/**
 * Parse multipart form data from Lambda event
 * @param {Object} event - Lambda event object
 * @returns {Object} Parsed form data with files and fields
 */
function parseMultipartFormData(event) {
  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  
  if (!contentType || !contentType.includes('multipart/form-data')) {
    throw new Error('Content-Type must be multipart/form-data');
  }

  // Extract boundary from content type
  const boundaryMatch = contentType.match(/boundary=(.+)$/);
  if (!boundaryMatch) {
    throw new Error('No boundary found in Content-Type header');
  }

  const boundary = boundaryMatch[1];
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);

  // Parse body
  const body = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
  
  const parts = [];
  let currentIndex = 0;

  // Find all boundary positions
  while (currentIndex < body.length) {
    const boundaryIndex = body.indexOf(boundaryBuffer, currentIndex);
    
    if (boundaryIndex === -1) {
      break;
    }

    // Check if this is the end boundary
    const nextBoundaryIndex = body.indexOf(boundaryBuffer, boundaryIndex + boundaryBuffer.length);
    const endBoundaryIndex = body.indexOf(endBoundaryBuffer, boundaryIndex);
    
    let partEnd;
    if (endBoundaryIndex !== -1 && (nextBoundaryIndex === -1 || endBoundaryIndex < nextBoundaryIndex)) {
      partEnd = endBoundaryIndex;
    } else if (nextBoundaryIndex !== -1) {
      partEnd = nextBoundaryIndex;
    } else {
      break;
    }

    // Extract part data
    const partStart = boundaryIndex + boundaryBuffer.length;
    const partData = body.slice(partStart, partEnd);
    
    if (partData.length > 0) {
      const part = parsePart(partData);
      if (part) {
        parts.push(part);
      }
    }

    currentIndex = partEnd;
  }

  // Organize parts into files and fields
  const result = {
    files: [],
    fields: {}
  };

  parts.forEach(part => {
    if (part.filename) {
      // This is a file
      result.files.push({
        fieldname: part.name,
        originalname: part.filename,
        mimetype: part.contentType || 'application/octet-stream',
        buffer: part.data,
        size: part.data.length
      });
    } else {
      // This is a regular field
      result.fields[part.name] = part.data.toString('utf8');
    }
  });

  return result;
}

/**
 * Parse individual part of multipart data
 * @param {Buffer} partData - Raw part data
 * @returns {Object|null} Parsed part or null if invalid
 */
function parsePart(partData) {
  // Find the end of headers (double CRLF)
  const headerEndIndex = partData.indexOf('\r\n\r\n');
  if (headerEndIndex === -1) {
    return null;
  }

  const headersBuffer = partData.slice(0, headerEndIndex);
  const bodyBuffer = partData.slice(headerEndIndex + 4);

  // Parse headers
  const headers = {};
  const headerLines = headersBuffer.toString('utf8').split('\r\n');
  
  headerLines.forEach(line => {
    const colonIndex = line.indexOf(':');
    if (colonIndex !== -1) {
      const key = line.slice(0, colonIndex).trim().toLowerCase();
      const value = line.slice(colonIndex + 1).trim();
      headers[key] = value;
    }
  });

  // Parse Content-Disposition header
  const disposition = headers['content-disposition'];
  if (!disposition) {
    return null;
  }

  const nameMatch = disposition.match(/name="([^"]+)"/);
  const filenameMatch = disposition.match(/filename="([^"]+)"/);
  
  if (!nameMatch) {
    return null;
  }

  return {
    name: nameMatch[1],
    filename: filenameMatch ? filenameMatch[1] : null,
    contentType: headers['content-type'],
    data: bodyBuffer
  };
}

/**
 * Validate uploaded file
 * @param {Object} file - File object
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateFile(file, options = {}) {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB default
    allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    required = true
  } = options;

  const errors = [];

  if (!file && required) {
    errors.push('File is required');
    return { isValid: false, errors };
  }

  if (!file) {
    return { isValid: true, errors: [] };
  }

  // Check file size
  if (file.size > maxSize) {
    errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`);
  }

  // Check mime type
  if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`Invalid file type '${file.mimetype}'. Allowed types: ${allowedMimeTypes.join(', ')}`);
  }

  // Check if file has content
  if (file.size === 0) {
    errors.push('File is empty');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract files from parsed multipart data with validation
 * @param {Object} event - Lambda event
 * @param {Object} options - Options for file validation
 * @returns {Object} Extracted and validated files
 */
function extractFiles(event, options = {}) {
  try {
    const parsed = parseMultipartFormData(event);
    
    if (parsed.files.length === 0) {
      throw new Error('No files found in request');
    }

    // Validate each file
    const validatedFiles = parsed.files.map(file => {
      const validation = validateFile(file, options);
      if (!validation.isValid) {
        throw new Error(`File validation failed for '${file.originalname}': ${validation.errors.join(', ')}`);
      }
      return file;
    });

    return {
      success: true,
      files: validatedFiles,
      fields: parsed.fields,
      totalFiles: validatedFiles.length,
      totalSize: validatedFiles.reduce((sum, file) => sum + file.size, 0)
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
      files: [],
      fields: {},
      totalFiles: 0,
      totalSize: 0
    };
  }
}

module.exports = {
  parseMultipartFormData,
  parsePart,
  validateFile,
  extractFiles
}; 