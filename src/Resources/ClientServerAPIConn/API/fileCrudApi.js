import fetchServer from "../fetchServer";

const CLIENT_MAX_UPLOAD_MB = 20;
const CLIENT_MAX_UPLOAD_BYTES = CLIENT_MAX_UPLOAD_MB * 1024 * 1024;

function blobToFile(blob, fallbackName = 'upload.jpg') {
  if (blob instanceof File) return blob;
  return new File([blob], fallbackName, { type: blob.type || 'image/jpeg' });
}

function compressImageFile(file, options = {}) {
  const {
    maxDimension = 1800,
    quality = 0.82,
    minCompressBytes = 450 * 1024,
  } = options;

  if (!file || !String(file.type || '').startsWith('image/')) {
    return Promise.resolve(file);
  }

  if (String(file.type || '').toLowerCase() === 'image/gif') {
    return Promise.resolve(file);
  }

  if (Number(file.size || 0) > 0 && Number(file.size || 0) <= minCompressBytes) {
    return Promise.resolve(file);
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round((img.width || 1) * scale));
        const height = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            resolve(file);
            return;
          }
          const originalName = file.name || 'upload.jpg';
          const nextName = originalName.replace(/\.[^.]+$/, '') + '.jpg';
          resolve(blobToFile(blob, nextName));
        }, 'image/jpeg', quality);
      } catch (e) {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1]; // strip data:mime;base64,
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function sendFileRequest(method, body, endpoint, server) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const res = await fetchServer(method, body, endpoint, server, controller.signal);
    if (res?.mess === 'Request aborted') {
      return {
        err: true,
        code: 'UPLOAD_TIMEOUT',
        mess: 'Image upload timed out. Please check the network, refresh the page, and try again with a smaller image.',
      };
    }
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function normalizeUploadResponse(res, file) {
  if (!res?.err) return res;

  const code = res.code || '';
  const fileSize = file?.size ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : '';
  const codeMessages = {
    UPLOAD_TIMEOUT: 'Image upload timed out in the browser after 120 seconds. The form data may save normally, but the image did not finish uploading. Retry with a smaller image or stronger connection.',
    UPLOAD_PAYLOAD_TOO_LARGE: `The image upload request is too large for the server. ${fileSize ? `Processed image size: ${fileSize}. ` : ''}Use a smaller image or reduce camera resolution before uploading.`,
    UPLOAD_FILE_TOO_LARGE: `The processed image is larger than the allowed ${CLIENT_MAX_UPLOAD_MB}MB upload size. ${fileSize ? `Processed image size: ${fileSize}. ` : ''}Please choose or compress a smaller image.`,
    UPLOAD_EMPTY_FILE: 'No image data reached the server. Please choose the image again and retry.',
    GOOGLE_DRIVE_AUTH_EXPIRED: 'Google Drive authorization has expired or was revoked. Refresh/regenerate the Google Drive token on the server, then retry the upload.',
    GOOGLE_DRIVE_PERMISSION_ERROR: 'Google Drive rejected this upload because the configured account does not have enough permission. Re-authorize the Drive token with file access.',
    GOOGLE_DRIVE_RATE_LIMITED: 'Google Drive is temporarily rate-limiting or quota-limiting uploads. Wait briefly, then retry.',
    GOOGLE_DRIVE_TIMEOUT: 'Google Drive accepted the request but did not complete the upload in time. Retry the image upload; the form data is separate from the image upload.',
  };

  return {
    ...res,
    mess: codeMessages[code] || res.mess || 'Image upload failed. Please retry or choose a smaller image.',
  };
}

function validateClientUploadSize(file) {
  if (file?.size > CLIENT_MAX_UPLOAD_BYTES) {
    return {
      err: true,
      code: 'UPLOAD_FILE_TOO_LARGE',
      mess: `The processed image is ${(file.size / 1024 / 1024).toFixed(1)}MB, which is larger than the allowed ${CLIENT_MAX_UPLOAD_MB}MB upload size. Please choose or compress a smaller image.`,
    };
  }
  return null;
}

export async function uploadFile(file, folderPath, createdAt, company, collection, server /* folderPAth: e.g. "/Payment Receipts" */) {
  const uploadableFile = await compressImageFile(blobToFile(file));
  const sizeError = validateClientUploadSize(uploadableFile);
  if (sizeError) return sizeError;
  const base64 = await fileToBase64(uploadableFile);
  const res = await sendFileRequest('POST',{
        collection: collection,
        prop:[{createdAt: createdAt}],
        imageInfo: {
            fileName: uploadableFile.name,
            mimeType: uploadableFile.type,
            fileData: base64,
            options: {folderPath}, // optional - will be made under BASE_FOLDER_PATH
        }
        
    } , 
    'uploadImage', 
    server
  )
  return normalizeUploadResponse(res, uploadableFile);
}

export async function uploadCompanyFile(file, folderPath, createdAt, company, collection, server /* folderPAth: e.g. "/Payment Receipts" */) {
  const uploadableFile = await compressImageFile(blobToFile(file));
  const sizeError = validateClientUploadSize(uploadableFile);
  if (sizeError) return sizeError;
  const base64 = await fileToBase64(uploadableFile);
  const res = await sendFileRequest('POST',{
        collection: collection,
        prop:[{db: company}],
        imageInfo: {
            fileName: uploadableFile.name,
            mimeType: uploadableFile.type,
            fileData: base64,
            options: {folderPath}, // optional - will be made under BASE_FOLDER_PATH
        }
        
    } , 
    'uploadCompanyImage', 
    server
  )
  return normalizeUploadResponse(res, uploadableFile);
}

export async function updateFile(fileId, file, createdAt, company, collection, server) {
  const uploadableFile = await compressImageFile(blobToFile(file));
  const sizeError = validateClientUploadSize(uploadableFile);
  if (sizeError) return sizeError;
  const base64 = await fileToBase64(uploadableFile);
  const res = await sendFileRequest('POST',{
        collection: collection,
        prop:[{createdAt: createdAt}],
        imageInfo: {
            fileId: fileId,
            fileName: uploadableFile.name,
            mimeType: uploadableFile.type,
            data: base64
        }
        
    } , 
    'updateImage', 
    server
  )
  return normalizeUploadResponse(res, uploadableFile);
}

export async function updateCompanyFile(fileId, file, createdAt, company, collection, server) {
  const uploadableFile = await compressImageFile(blobToFile(file));
  const sizeError = validateClientUploadSize(uploadableFile);
  if (sizeError) return sizeError;
  const base64 = await fileToBase64(uploadableFile);
  const res = await sendFileRequest('POST',{
        collection: collection,
        prop:[{db: company}],
        imageInfo: {
            fileId: fileId,
            fileName: uploadableFile.name,
            mimeType: uploadableFile.type,
            data: base64
        }
        
    } , 
    'updateCompanyImage', 
    server
  )
  return normalizeUploadResponse(res, uploadableFile);
}

export async function getFileUrl(fileId, server) {
  const res = await fetchServer('POST',{imgId: fileId}, 'getImageLink', server);
  return res;
}

export async function deleteFile(fileId, server) {
  const res = await fetchServer('POST',{imgId: fileId}, 'deleteImage', server);
  return res;
}

// Optional: ensure folder endpoint
export async function createFolder(folderPath, server) {
  const res = await fetchServer('POST', {folderPath}, 'createFolderPath', server)
  return res;
}
