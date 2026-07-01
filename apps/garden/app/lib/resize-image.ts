const DEFAULT_MAX_DIMENSION = 2000;
const DEFAULT_QUALITY = 0.85;

export type ResizedImage = {
  file: File;
  width: number;
  height: number;
};

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image: ${file.name}`));
    };
    image.src = url;
  });
}

function scaleDimensions(width: number, height: number, maxDimension: number) {
  const longestEdge = Math.max(width, height);
  if (longestEdge <= maxDimension) {
    return { width, height };
  }

  const scale = maxDimension / longestEdge;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
}

function canvasToFile(
  canvas: HTMLCanvasElement,
  fileName: string,
  contentType: string,
  quality: number,
) {
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error(`Could not resize image: ${fileName}`));
          return;
        }

        const baseName = fileName.replace(/\.[^.]+$/, "");
        resolve(new File([blob], `${baseName}.jpg`, { type: contentType }));
      },
      contentType,
      quality,
    );
  });
}

export async function resizeImageFile(
  file: File,
  maxDimension = DEFAULT_MAX_DIMENSION,
  quality = DEFAULT_QUALITY,
): Promise<ResizedImage> {
  const image = await loadImageFromFile(file);
  const { width, height } = scaleDimensions(image.naturalWidth, image.naturalHeight, maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not prepare image canvas.");
  }

  context.drawImage(image, 0, 0, width, height);

  const resizedFile = await canvasToFile(canvas, file.name, "image/jpeg", quality);
  return { file: resizedFile, width, height };
}

export async function resizeImageFiles(files: File[]) {
  return Promise.all(files.map((file) => resizeImageFile(file)));
}
