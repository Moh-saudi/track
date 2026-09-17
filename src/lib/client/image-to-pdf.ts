type PdfImage = {
  bytes: Uint8Array;
  width: number;
  height: number;
};

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_CANVAS_DIMENSION = 1800;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

async function imageFileToJpeg(file: File): Promise<PdfImage> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("صورة البطاقة يجب أن تكون JPG أو PNG أو WEBP");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("حجم كل صورة من صور البطاقة يجب ألا يتجاوز 6 ميجابايت");
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("تعذر قراءة إحدى صور بطاقة الرقم القومي"));
      img.src = objectUrl;
    });

    const naturalWidth = image.naturalWidth;
    const naturalHeight = image.naturalHeight;
    if (!naturalWidth || !naturalHeight) {
      throw new Error("أبعاد صورة بطاقة الرقم القومي غير صالحة");
    }

    const scale = Math.min(1, MAX_CANVAS_DIMENSION / Math.max(naturalWidth, naturalHeight));
    const width = Math.max(1, Math.round(naturalWidth * scale));
    const height = Math.max(1, Math.round(naturalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("تعذر تجهيز صورة بطاقة الرقم القومي");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const jpegBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error("تعذر تحويل صورة البطاقة إلى PDF")),
        "image/jpeg",
        0.9
      );
    });

    return {
      bytes: new Uint8Array(await jpegBlob.arrayBuffer()),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function buildPdf(images: PdfImage[]): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let byteOffset = 0;

  const append = (part: Uint8Array | string) => {
    const bytes = typeof part === "string" ? encoder.encode(part) : part;
    parts.push(bytes);
    byteOffset += bytes.length;
  };

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 36;
  const totalObjects = 2 + images.length * 3;
  const pageObjectNumbers = images.map((_, index) => 3 + index * 3);

  append("%PDF-1.4\n");

  offsets[1] = byteOffset;
  append("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  offsets[2] = byteOffset;
  append(`2 0 obj\n<< /Type /Pages /Count ${images.length} /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] >>\nendobj\n`);

  images.forEach((image, index) => {
    const pageObj = 3 + index * 3;
    const imageObj = pageObj + 1;
    const contentObj = pageObj + 2;

    const fitScale = Math.min(
      (pageWidth - margin * 2) / image.width,
      (pageHeight - margin * 2) / image.height
    );
    const renderWidth = image.width * fitScale;
    const renderHeight = image.height * fitScale;
    const x = (pageWidth - renderWidth) / 2;
    const y = (pageHeight - renderHeight) / 2;
    const content = `q\n${renderWidth.toFixed(2)} 0 0 ${renderHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im0 Do\nQ\n`;
    const contentBytes = encoder.encode(content);

    offsets[pageObj] = byteOffset;
    append(`${pageObj} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>\nendobj\n`);

    offsets[imageObj] = byteOffset;
    append(`${imageObj} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    append(image.bytes);
    append("\nendstream\nendobj\n");

    offsets[contentObj] = byteOffset;
    append(`${contentObj} 0 obj\n<< /Length ${contentBytes.length} >>\nstream\n`);
    append(contentBytes);
    append("endstream\nendobj\n");
  });

  const xrefOffset = byteOffset;
  append(`xref\n0 ${totalObjects + 1}\n`);
  append("0000000000 65535 f \n");
  for (let objectNumber = 1; objectNumber <= totalObjects; objectNumber++) {
    append(`${String(offsets[objectNumber]).padStart(10, "0")} 00000 n \n`);
  }
  append(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

  const pdfBytes = concatBytes(parts);
  return new Blob([pdfBytes.buffer], { type: "application/pdf" });
}

export async function createNationalIdPdf(front: File, back: File): Promise<Blob> {
  const [frontImage, backImage] = await Promise.all([
    imageFileToJpeg(front),
    imageFileToJpeg(back),
  ]);
  return buildPdf([frontImage, backImage]);
}
