import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

const router = express.Router();

// Configure multer to store files in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
  },
  fileFilter: (req, file, cb) => {
    // Only accept images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Helper function to upload buffer to Cloudinary
const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `hudumalink/${folder}`, // Organize by folder
        resource_type: 'auto',
        transformation: [
          { width: 1920, height: 1920, crop: 'limit' }, // Max dimensions
          { quality: 'auto:good' }, // Auto quality optimization
          { fetch_format: 'auto' }, // Auto format (WebP when supported)
        ],
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result!.secure_url);
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// POST /api/upload/project-images
// Upload multiple images for client projects
router.post('/project-images', upload.array('images', 10), async (req, res) => {
  console.log('Upload route hit!');
  console.log('req.files:', req.files);
  console.log('req.body:', req.body);

  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      console.log('No files received');
      return res.status(400).json({ error: 'No images provided' });
    }

    console.log(`Uploading ${req.files.length} project images...`);

    // Upload all images to Cloudinary
    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, 'projects')
    );

    const urls = await Promise.all(uploadPromises);

    console.log(`Successfully uploaded ${urls.length} images`);

    res.json({
      success: true,
      urls,
      count: urls.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// POST /api/upload/portfolio-images
// Upload before/after images for designer portfolios
router.post('/portfolio-images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    console.log(`Uploading ${req.files.length} portfolio images...`);

    // Upload all images to Cloudinary
    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, 'portfolios')
    );

    const urls = await Promise.all(uploadPromises);

    console.log(`Successfully uploaded ${urls.length} images`);

    res.json({
      success: true,
      urls,
      count: urls.length,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// POST /api/upload/profile-images
// Upload single profile/avatar/cover images
router.post('/profile-images', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    console.log('Uploading profile image...');

    const url = await uploadToCloudinary(req.file.buffer, 'profiles');

    console.log('Successfully uploaded profile image');

    res.json({
      success: true,
      url,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// DELETE /api/upload/delete
// Delete image from Cloudinary (optional - for cleanup)
router.delete('/delete', async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID required' });
    }

    await cloudinary.uploader.destroy(publicId);

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

export default router;