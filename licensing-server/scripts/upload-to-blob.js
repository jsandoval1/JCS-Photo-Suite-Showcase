const fs = require('fs');
const path = require('path');
const { put } = require('@vercel/blob');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL
});

async function uploadToBlob(token) {
  try {
    console.log(`Uploading ZIP for token: ${token}`);
    
    const zipPath = path.join(__dirname, '../../downloads', `${token}.zip`);
    
    // Check if file exists
    if (!fs.existsSync(zipPath)) {
      throw new Error(`ZIP file not found at ${zipPath}`);
    }
    
    // Upload to Vercel Blob
    const { url } = await put(`downloads/${token}.zip`, fs.readFileSync(zipPath), { access: 'public' });
    
    console.log(`✅ Successfully uploaded ZIP for token: ${token}`);
    console.log(`📦 Blob URL: ${url}`);
    
    // Update database with blob URL
    await pool.query(
      'UPDATE downloads SET blob_url = $1, status = $2 WHERE token = $3',
      [url, 'ready', token]
    );
    
    console.log(`✅ Database updated for token: ${token}`);
    
    return url;
  } catch (error) {
    console.error(`❌ Failed to upload ZIP for token: ${token}`, error);
    
    // Update database with error status
    try {
      await pool.query(
        'UPDATE downloads SET status = $1 WHERE token = $2',
        ['error', token]
      );
      console.log(`✅ Database updated with error status for token: ${token}`);
    } catch (dbError) {
      console.error(`❌ Failed to update database with error status:`, dbError);
    }
    
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  const token = process.argv[2];
  if (!token) {
    console.error('Usage: node upload-to-blob.js <token>');
    process.exit(1);
  }
  
  uploadToBlob(token)
    .then(() => {
      console.log('Upload completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Upload failed:', error);
      process.exit(1);
    });
}

module.exports = { uploadToBlob }; 