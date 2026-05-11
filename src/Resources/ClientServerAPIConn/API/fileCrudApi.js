import fetchServer from "../fetchServer";

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

export async function uploadFile(file, folderPath, createdAt, company, collection, server /* folderPAth: e.g. "/Payment Receipts" */) {
  const base64 = await fileToBase64(file);
  const res = fetchServer('POST',{
        collection: collection,
        prop:[{createdAt: createdAt}],
        imageInfo: {
            fileName: file.name,
            mimeType: file.type,
            fileData: base64,
            options: {folderPath}, // optional - will be made under BASE_FOLDER_PATH
        }
        
    } , 
    'uploadImage', 
    server
  )
  return res;
}

export async function updateFile(fileId, file, createdAt, company, collection, server) {
  const base64 = await fileToBase64(file);
  const res = fetchServer('POST',{
        collection: collection,
        prop:[{createdAt: createdAt}],
        imageInfo: {
            fileId: fileId,
            fileName: file.name,
            mimeType: file.type,
            data: base64
        }
        
    } , 
    'updateImage', 
    server
  )
  return res;
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