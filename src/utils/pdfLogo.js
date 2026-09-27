// Shared by every PDF exporter (jsPDF-based ones use loadPdfImage +
// fitImageBox directly; html2pdf/react-to-pdf ones just need the raw
// logoUrl to drop into an <img> tag — see resolveReportLogoUrl).
//
// Two hard rules across every exported report, per explicit product
// direction: (1) if the tenant uploaded a logo, it must render properly
// sized — never stretched/distorted to fit a fixed box, which is what a
// naive fixed-width-and-height addImage() call does to any non-square
// image; (2) if the tenant did NOT upload one, the report must show NO
// logo at all — never this platform's own logo. A report is the tenant's
// own document going to their own customers/records; branding it with a
// third party's logo when the tenant has none of their own is wrong in a
// way that a web-UI placeholder logo isn't.

// Loads a remote image and returns its base64 data URI plus natural pixel
// dimensions — jsPDF's addImage has no way to ask "what size is this
// image", so the caller can't aspect-fit it without knowing that up front.
// Returns null on any failure (missing URL, network error, blocked fetch)
// rather than throwing — every caller already treats "no logo" as "skip
// it, don't fail the whole export".
export const loadPdfImage = async (url) => {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const { width, height } = await new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
      img.onerror = reject;
      img.src = dataUrl;
    });
    const format = /image\/png/i.test(blob.type) ? 'PNG'
      : /image\/webp/i.test(blob.type) ? 'WEBP'
      : 'JPEG'; // uploaded company logos/signatures are compressed to JPEG on upload — see fileCrudApi.js's compressImageFile
    return { dataUrl, width, height, format };
  } catch (e) {
    return null;
  }
};

// Fits an image's real aspect ratio inside a maxWidth x maxHeight box
// (same unit as the jsPDF document, mm by default) without distorting it.
// jsPDF's own addImage stretches to exactly the w/h you pass — this is
// what actually prevents the "any non-square uploaded logo gets squashed
// into a square" bug.
export const fitImageBox = (image, maxWidth, maxHeight) => {
  const ratio = image.width / image.height || 1;
  let w = maxWidth;
  let h = w / ratio;
  if (h > maxHeight) {
    h = maxHeight;
    w = h * ratio;
  }
  return { w, h };
};
