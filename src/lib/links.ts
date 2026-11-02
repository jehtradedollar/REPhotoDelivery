// Download routes check the session and payment before handing out a storage URL.
export const downloadHref = (mediaId: string) => `/api/download/${mediaId}`;
export const projectZipHref = (projectId: string) => `/api/download/project/${projectId}`;
