import QRCode from 'qrcode';
import jsQR from 'jsqr';

export interface QRCodePayload {
  token: string;
  code: string;
  type: 'attendance' | 'facility';
  sessionId: string;
  title: string;
  location?: string;
}

/**
 * Generate high-resolution Data URL (PNG) for a given text or QR payload
 */
export async function generateQRCodeDataUrl(
  data: string | QRCodePayload,
  options?: QRCode.QRCodeToDataURLOptions
): Promise<string> {
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  return QRCode.toDataURL(text, {
    width: 380,
    margin: 2,
    color: {
      dark: '#1e1b4b', // deep indigo/slate
      light: '#ffffff',
    },
    errorCorrectionLevel: 'M',
    ...options,
  });
}

/**
 * Scan / decode a QR code from an HTML canvas or image element
 */
export function decodeQRCodeFromImageData(
  imageData: ImageData
): { data: string; parsedPayload?: QRCodePayload } | null {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: 'dontInvert',
  });

  if (!code || !code.data) {
    return null;
  }

  let parsedPayload: QRCodePayload | undefined;
  try {
    parsedPayload = JSON.parse(code.data);
  } catch {
    // Plain text or token
  }

  return {
    data: code.data,
    parsedPayload,
  };
}

/**
 * Decode QR code from an HTML Image Element or File
 */
export async function decodeQRCodeFromFile(
  file: File
): Promise<{ data: string; parsedPayload?: QRCodePayload } | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const result = decodeQRCodeFromImageData(imgData);
        resolve(result);
      };
      img.onerror = () => resolve(null);
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
