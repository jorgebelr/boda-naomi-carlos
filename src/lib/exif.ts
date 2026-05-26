import exifr from 'exifr';

export interface PhotoMetadata {
  takenAt: Date;
  cameraMake?: string;
  cameraModel?: string;
  width?: number;
  height?: number;
  orientation?: string | number;
  latitude?: number;
  longitude?: number;
  additional?: Record<string, unknown>;
}

/**
 * Parsea de manera segura un string de fecha EXIF (ej: "YYYY:MM:DD HH:MM:SS")
 * a un objeto Date local unificado. Evita discrepancias de zona horaria (UTC vs Local)
 * entre navegadores Android e iOS.
 */
function parseExifDate(dateStr: string): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  
  const cleanStr = dateStr.trim();
  
  // Expresión regular para capturar "YYYY:MM:DD HH:MM:SS" (u otros separadores comunes como - o .)
  const parts = cleanStr.match(/^(\d{4})[:.-](\d{2})[:.-](\d{2})\s+(\d{2})[:.-](\d{2})[:.-](\d{2})$/);
  
  if (parts) {
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // Mes indexado en 0 en JS (0 = enero)
    const day = parseInt(parts[3], 10);
    const hour = parseInt(parts[4], 10);
    const minute = parseInt(parts[5], 10);
    const second = parseInt(parts[6], 10);
    
    // Crear el objeto Date usando constructor de componentes locales,
    // garantizando que se interprete en la zona horaria del dispositivo de subida.
    const localDate = new Date(year, month, day, hour, minute, second);
    if (!isNaN(localDate.getTime())) {
      return localDate;
    }
  }
  
  // Segundo fallback: reemplazar dos primeros dos puntos de "YYYY:MM:DD" por guiones
  // (ej: "2026:05:26 15:30:00" -> "2026-05-26 15:30:00") para que el constructor de JS lo entienda.
  const fallbackStr = cleanStr.replace(/:/g, (match, index) => index < 10 ? '-' : match);
  const fallbackDate = new Date(fallbackStr);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }
  
  return null;
}

/**
 * Extrae metadatos EXIF de un archivo de imagen en el cliente.
 * Si no existen metadatos EXIF, hace fallback a la fecha de última modificación o a la fecha actual.
 */
export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    // Analizar la imagen con exifr.
    // Solicitamos parsear etiquetas TIFF (cámara), GPS y dimensiones comunes.
    // Desactivamos timestamp para recibir el string de fecha crudo y controlarlo.
    const rawMeta = await exifr.parse(file, {
      tiff: true,
      xmp: false,
      gps: true,
      exif: true,
      timestamp: false,
    } as unknown as Parameters<typeof exifr.parse>[1]);

    const metadata: PhotoMetadata = {
      takenAt: file.lastModified ? new Date(file.lastModified) : new Date(), // Fallback inicial por defecto
    };

    if (rawMeta) {
      // 1. Extraer fecha original de captura buscando múltiples candidatos EXIF comunes
      let dateObj: Date | null = null;
      const dateCandidates = [
        rawMeta.DateTimeOriginal,
        rawMeta.CreateDate,
        rawMeta.ModifyDate,
        rawMeta.DateTimeDigitized
      ];

      for (const candidate of dateCandidates) {
        if (!candidate) continue;
        if (typeof candidate === 'string') {
          dateObj = parseExifDate(candidate);
          if (dateObj) break;
        } else if (candidate instanceof Date && !isNaN(candidate.getTime())) {
          dateObj = candidate;
          break;
        }
      }

      if (dateObj) {
        metadata.takenAt = dateObj;
      }

      // 2. Extraer información de cámara
      metadata.cameraMake = rawMeta.Make ? String(rawMeta.Make).trim() : undefined;
      metadata.cameraModel = rawMeta.Model ? String(rawMeta.Model).trim() : undefined;

      // 3. Extraer dimensiones
      const width = rawMeta.ExifImageWidth || rawMeta.PixelXDimension || rawMeta.ImageWidth;
      const height = rawMeta.ExifImageHeight || rawMeta.PixelYDimension || rawMeta.ImageHeight;
      metadata.width = width ? Number(width) : undefined;
      metadata.height = height ? Number(height) : undefined;

      // 4. Orientación
      metadata.orientation = rawMeta.Orientation || undefined;

      // 5. GPS (si existe)
      if (rawMeta.latitude !== undefined && rawMeta.longitude !== undefined) {
        metadata.latitude = Number(rawMeta.latitude);
        metadata.longitude = Number(rawMeta.longitude);
      }

      // Guardar metadatos crudos para persistencia
      metadata.additional = rawMeta;
    }

    return metadata;
  } catch (error) {
    console.warn('No se pudieron extraer metadatos EXIF o el formato no lo soporta. Usando fallback.', error);
    return {
      takenAt: file.lastModified ? new Date(file.lastModified) : new Date(),
    };
  }
}
