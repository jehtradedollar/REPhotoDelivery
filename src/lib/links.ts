// Download routes check access (session or delivery link) and payment before
// handing out a storage URL. `mls` asks for the 2048px, under-1 MB copy.
export interface LinkOpts {
  /** Delivery-link token, for the stand-alone page where nobody is signed in. */
  token?: string | null;
  mls?: boolean;
}

function qs({ token, mls }: LinkOpts) {
  const q = new URLSearchParams();
  if (token) q.set("t", token);
  if (mls) q.set("v", "mls");
  const s = q.toString();
  return s ? `?${s}` : "";
}

export const downloadHref = (mediaId: string, o: LinkOpts = {}) => `/api/download/${mediaId}${qs(o)}`;
export const projectZipHref = (projectId: string, o: LinkOpts = {}) => `/api/download/project/${projectId}${qs(o)}`;
export const stockHref = (projectId: string, stockId: string, o: LinkOpts = {}) => `/api/download/stock/${projectId}/${stockId}${qs(o)}`;
export const deliveryPath = (token: string) => `/d/${token}`;

/** "IMG_0042.dng" -> "IMG_0042-MLS.jpg" */
export const mlsFilename = (name: string) => `${name.replace(/\.[^.]+$/, "")}-MLS.jpg`;
