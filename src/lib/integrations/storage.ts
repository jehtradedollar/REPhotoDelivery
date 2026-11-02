// Media storage. The UI only talks to this interface.
// Today: MockStorageProvider (placeholder renders, nothing persisted).
// Later: S3StorageProvider using @aws-sdk/client-s3 + @aws-sdk/s3-request-presigner.

export interface UploadTarget {
  /** Where the browser should PUT the file. */
  url: string;
  method: "PUT";
  headers: Record<string, string>;
  /** Object key the file will live at once uploaded. */
  key: string;
}

export interface StorageProvider {
  readonly name: string;
  /** Presigned URL the browser uploads to directly (keeps large files off the app server). */
  createUploadTarget(input: { projectId: string; filename: string; contentType: string }): Promise<UploadTarget>;
  /** Short-lived URL for viewing a web-sized preview. */
  getPreviewUrl(key: string): Promise<string | null>;
  /** Short-lived URL for downloading the original. Only call after payment is confirmed. */
  getDownloadUrl(key: string, opts?: { filename?: string; expiresInSec?: number }): Promise<string>;
  /** Single zip of every original in a project. */
  getProjectArchiveUrl(projectId: string): Promise<string>;
  deleteObject(key: string): Promise<void>;
}

export class MockStorageProvider implements StorageProvider {
  readonly name = "mock";

  async createUploadTarget({ projectId, filename, contentType }: { projectId: string; filename: string; contentType: string }): Promise<UploadTarget> {
    const key = `projects/${projectId}/${Date.now()}-${filename}`;
    return { url: `/api/mock-upload?key=${encodeURIComponent(key)}`, method: "PUT", headers: { "Content-Type": contentType }, key };
  }

  async getPreviewUrl(): Promise<string | null> {
    // The UI renders a generated placeholder when this returns null.
    return null;
  }

  async getDownloadUrl(key: string, opts?: { filename?: string }): Promise<string> {
    return `/api/mock-download?key=${encodeURIComponent(key)}&filename=${encodeURIComponent(opts?.filename ?? "")}`;
  }

  async getProjectArchiveUrl(projectId: string): Promise<string> {
    return `/api/mock-download?key=${encodeURIComponent(`projects/${projectId}/all.zip`)}&filename=${projectId}.zip`;
  }

  async deleteObject(): Promise<void> {}
}

/*
 * S3 sketch for later:
 *
 * export class S3StorageProvider implements StorageProvider {
 *   readonly name = "s3";
 *   constructor(private s3 = new S3Client({ region: process.env.AWS_REGION }), private bucket = process.env.AWS_S3_BUCKET!) {}
 *   async createUploadTarget({ projectId, filename, contentType }) {
 *     const key = `projects/${projectId}/originals/${crypto.randomUUID()}-${filename}`;
 *     const url = await getSignedUrl(this.s3, new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType }), { expiresIn: 900 });
 *     return { url, method: "PUT", headers: { "Content-Type": contentType }, key };
 *   }
 *   async getDownloadUrl(key, opts) {
 *     return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key,
 *       ResponseContentDisposition: `attachment; filename="${opts?.filename ?? key.split("/").pop()}"` }), { expiresIn: opts?.expiresInSec ?? 300 });
 *   }
 *   ...
 * }
 */
