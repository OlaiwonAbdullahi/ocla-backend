const imagekit = require('../config/imagekit');
const { toFile } = require('@imagekit/nodejs');
const path = require('path');

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES];

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;  // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

function validateFile(file) {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    return `"${file.originalname}" is not an allowed type. Accepted: jpeg, png, webp, gif, mp4, webm, mov`;
  }
  const limit = ALLOWED_VIDEO_TYPES.includes(file.mimetype) ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
  if (file.size > limit) {
    const mb = limit / 1024 / 1024;
    return `"${file.originalname}" exceeds the ${mb} MB limit`;
  }
  return null;
}

async function uploadToImageKit(file, folder) {
  const ext = path.extname(file.originalname);
  const baseName = path.basename(file.originalname, ext).replace(/\s+/g, '-');
  const fileName = `${baseName}-${Date.now()}${ext}`;

  const uploadable = await toFile(file.buffer, fileName, { type: file.mimetype });
  const result = await imagekit.files.upload({
    file: uploadable,
    fileName,
    folder: folder || '/products',
    useUniqueFileName: false,
  });

  return {
    url: result.url,
    fileId: result.fileId,
    name: result.name,
    size: result.size,
    type: ALLOWED_VIDEO_TYPES.includes(file.mimetype) ? 'video' : 'image',
    mimeType: file.mimetype,
  };
}

// POST /api/admin/media/upload
// Body: multipart/form-data, field "file" (single), optional field "folder"
async function uploadSingle(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded. Use field name "file".' });
    }

    const error = validateFile(req.file);
    if (error) return res.status(400).json({ success: false, message: error });

    const result = await uploadToImageKit(req.file, req.body.folder);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/media/upload/batch
// Body: multipart/form-data, field "files" (up to 10), optional field "folder"
async function uploadBatch(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded. Use field name "files".' });
    }

    for (const file of req.files) {
      const error = validateFile(file);
      if (error) return res.status(400).json({ success: false, message: error });
    }

    const results = await Promise.all(
      req.files.map((file) => uploadToImageKit(file, req.body.folder))
    );

    res.status(201).json({ success: true, data: results });
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadSingle, uploadBatch };
