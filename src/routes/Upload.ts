import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import { requireAuth } from '../middlewares/auth';
import User from '../models/User';

const router = express.Router();

// Cloudinary config (make sure .env has these)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer: store in memory
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// Helper: upload buffer to Cloudinary
const uploadToCloudinary = (buffer: Buffer, folder: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `hudumalink/${folder}`,
        resource_type: 'auto',
        transformation: [
          { width: 1920, height: 1920, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result!.secure_url);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// POST /api/upload/project-images
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

    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, 'projects')
    );

    const urls = await Promise.all(uploadPromises);

    console.log(`Successfully uploaded ${urls.length} images`);

    res.json({ success: true, urls, count: urls.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// POST /api/upload/portfolio-images
router.post('/portfolio-images', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    console.log(`Uploading ${req.files.length} portfolio images...`);

    const uploadPromises = req.files.map((file) =>
      uploadToCloudinary(file.buffer, 'portfolios')
    );

    const urls = await Promise.all(uploadPromises);

    res.json({ success: true, urls, count: urls.length });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
});

// POST /api/upload/profile-images
router.post('/profile-images', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const url = await uploadToCloudinary(req.file.buffer, 'profiles');

    res.json({ success: true, url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// ─── POST /api/upload/inspiration-image ──────────────────────────────────────
// Upload a single before OR after image for inspirations
// Uses its own dedicated folder so images are never mixed with covers/profiles
router.post(
  '/inspiration-image',
  requireAuth,
  upload.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image provided' });
      }

      // type must be 'before' or 'after' — used for logging/debugging only
      const type = req.body.type === 'after' ? 'after' : 'before';
      console.log(`Uploading inspiration ${type} image...`);

      const url = await uploadToCloudinary(req.file.buffer, 'inspiration-images');

      console.log(`Successfully uploaded inspiration ${type} image:`, url);

      res.json({ success: true, url });
    } catch (error) {
      console.error('Inspiration image upload error:', error);
      res.status(500).json({ success: false, error: 'Failed to upload image' });
    }
  }
);

// DELETE /api/upload/delete
router.delete('/delete', async (req, res) => {
  try {
    const { publicId } = req.body;

    if (!publicId) {
      return res.status(400).json({ error: 'Public ID required' });
    }

    await cloudinary.uploader.destroy(publicId);

    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

router.post(
  '/designer-apply',
  requireAuth,
  upload.fields([
    { name: 'portfolioImages', maxCount: 20 },
    { name: 'credentials', maxCount: 10 },
  ]),
  async (req: any, res) => {
    try {
      const user = req.user;

      if (user.designerProfile?.status && user.designerProfile.status !== 'rejected') {
        return res.status(400).json({
          success: false,
          error: 'You have already submitted an application',
        });
      }

      const portfolioUrls: string[] = [];
      if (req.files?.portfolioImages) {
        const files = Array.isArray(req.files.portfolioImages)
          ? req.files.portfolioImages
          : [req.files.portfolioImages];
        for (const file of files) {
          const url = await uploadToCloudinary(file.buffer, 'designer-portfolio');
          portfolioUrls.push(url);
        }
      }

      const credentialUrls: string[] = [];
      if (req.files?.credentials) {
        const files = Array.isArray(req.files.credentials)
          ? req.files.credentials
          : [req.files.credentials];
        for (const file of files) {
          const url = await uploadToCloudinary(file.buffer, 'designer-credentials');
          credentialUrls.push(url);
        }
      }

      const {
        fullName, phone, idNumber, experience, education,
        location, about, startingPrice, responseTime,
        calendlyLink, videoUrl, styles, references, socialLinks,
      } = req.body;

      const parsedStyles      = styles       ? JSON.parse(styles)       : [];
      const parsedReferences  = references   ? JSON.parse(references)   : [];
      const parsedSocialLinks = socialLinks  ? JSON.parse(socialLinks)  : {};

      user.designerProfile = {
        status: 'pending',
        idNumber: idNumber || '',
        portfolioImages: portfolioUrls,
        credentials: credentialUrls,
        references: parsedReferences,
        location: location || '',
        about: about || '',
        styles: parsedStyles,
        startingPrice: Number(startingPrice) || 0,
        responseTime: responseTime || '',
        calendlyLink: calendlyLink || '',
        videoUrl: videoUrl || '',
        socialLinks: parsedSocialLinks,
        verified: false,
        superVerified: false,
        rating: 0,
        reviewCount: 0,
        projectsCompleted: 0,
      };

      if (!user.roles.includes('designer')) user.roles.push('designer');
      if (fullName) user.name = fullName;
      if (phone)    user.phone = phone;

      await user.save();

      res.json({
        success: true,
        message: 'Designer application submitted successfully! Awaiting admin approval.',
      });
    } catch (error: any) {
      console.error('Designer application error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit application',
        details: error.message,
      });
    }
  }
);

export default router;