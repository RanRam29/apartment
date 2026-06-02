const fs = require('fs');
const path = require('path');

function getJpegSize(filePath) {
  const data = fs.readFileSync(filePath);
  let i = 0;
  if (data[i] !== 0xFF || data[i + 1] !== 0xD8) {
    throw new Error('Not a valid JPEG');
  }
  i += 2;
  while (i < data.length) {
    if (data[i] !== 0xFF) {
      throw new Error('Invalid marker');
    }
    const marker = data[i + 1];
    if (marker === 0xD9 || marker === 0xDA) {
      break; // End of image or start of scan
    }
    const size = data.readUInt16BE(i + 2);
    if (marker >= 0xC0 && marker <= 0xC3) {
      const height = data.readUInt16BE(i + 5);
      const width = data.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + size;
  }
  throw new Error('SOF marker not found');
}

try {
  const logoPath = path.join(__dirname, '..', 'Logo.jpg');
  console.log('Logo dimensions:', getJpegSize(logoPath));
} catch (err) {
  console.error('Error:', err.message);
}
