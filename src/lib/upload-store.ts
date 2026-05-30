// Almacenamiento temporal en memoria del cliente para compartir archivos File
// entre páginas durante la navegación client-side de Next.js.
let sharedFiles: File[] = [];

export function getSharedFiles(): File[] {
  const temp = sharedFiles;
  sharedFiles = []; // Limpiar para evitar fugas de memoria
  return temp;
}

export function setSharedFiles(files: File[]) {
  sharedFiles = files;
}
