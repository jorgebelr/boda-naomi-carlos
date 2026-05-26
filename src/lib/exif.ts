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
 * Extrae metadatos EXIF de un archivo de imagen en el cliente.
 * Si no existen metadatos EXIF, hace fallback a la fecha de última modificación o a la fecha actual.
 */
export async function extractPhotoMetadata(file: File): Promise<PhotoMetadata> {
  try {
    // Analizar la imagen con exifr.
    // Solicitamos parsear etiquetas TIFF (cámara), GPS y dimensiones comunes.
    const rawMeta = await exifr.parse(file, {
      tiff: true,
      xmp: false,
      gps: true,
      exif: true,
    });

    const metadata: PhotoMetadata = {
      takenAt: new Date(), // Fallback inicial
    };

    if (rawMeta) {
      // 1. Extraer fecha original de captura
      if (rawMeta.DateTimeOriginal) {
        // exifr suele devolver un objeto Date directamente para DateTimeOriginal
        const dateObj = typeof rawMeta.DateTimeOriginal === 'string' 
          ? new Date(rawMeta.DateTimeOriginal) 
          : rawMeta.DateTimeOriginal;
          
        if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
          metadata.takenAt = dateObj;
        } else if (file.lastModified) {
          metadata.takenAt = new Date(file.lastModified);
        }
      } else if (file.lastModified) {
        metadata.takenAt = new Date(file.lastModified);
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
    } else {
      // Si exifr no devuelve nada, usamos la última modificación del archivo
      if (file.lastModified) {
        metadata.takenAt = new Date(file.lastModified);
      }
    }

    return metadata;
  } catch (error) {
    console.warn('No se pudieron extraer metadatos EXIF o el formato no lo soporta. Usando fallback.', error);
    return {
      takenAt: file.lastModified ? new Date(file.lastModified) : new Date(),
    };
  }
}
