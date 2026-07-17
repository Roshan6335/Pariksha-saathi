export function capString(s, maxLen) {
  if (typeof s !== "string") return "";
  return s.slice(0, maxLen);
}

export function isNonEmptyString(s, maxLen = 5000) {
  return typeof s === "string" && s.trim().length > 0 && s.length <= maxLen;
}

// Rough size check on a base64 data URL without fully decoding it.
export function isImageTooLarge(dataUrl, maxBytes = 6 * 1024 * 1024) {
  if (!dataUrl || typeof dataUrl !== "string") return false;
  const base64 = dataUrl.split(",")[1] || "";
  const approxBytes = base64.length * 0.75;
  return approxBytes > maxBytes;
}

export function isValidImageDataUrl(dataUrl) {
  return typeof dataUrl === "string" && /^data:image\/(png|jpeg|jpg|webp|gif);base64,/.test(dataUrl);
}
