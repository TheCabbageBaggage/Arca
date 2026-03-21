const env = process.env;

function normalizeBasePath(basePath = '/ERP-Documents') {
  const trimmed = String(basePath || '/ERP-Documents').trim();
  if (!trimmed) {
    return '/ERP-Documents';
  }
  return trimmed.startsWith('/') ? trimmed.replace(/\/+$/, '') : `/${trimmed.replace(/\/+$/, '')}`;
}

function sanitizeSegment(value) {
  return String(value ?? '')
    .trim()
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function sanitizeFilename(filename) {
  return sanitizeSegment(filename).replace(/-+/g, '-');
}

function buildLocalPath(basePath, recordType, recordId, filename) {
  return `${normalizeBasePath(basePath)}/${sanitizeSegment(recordType)}/${sanitizeSegment(recordId)}/${sanitizeFilename(filename)}`;
}

class NextcloudClient {
  constructor(options = {}) {
    this.url = options.url ?? env.NEXTCLOUD_URL ?? null;
    this.user = options.user ?? env.NEXTCLOUD_USER ?? null;
    this.password = options.password ?? env.NEXTCLOUD_PASSWORD ?? null;
    this.basePath = normalizeBasePath(options.basePath ?? env.NEXTCLOUD_BASE_PATH ?? '/ERP-Documents');
  }

  isConfigured() {
    return Boolean(this.url && this.user && this.password);
  }

  buildPath(recordType, recordId, filename) {
    return buildLocalPath(this.basePath, recordType, recordId, filename);
  }

  buildRemoteUrl(recordType, recordId, filename) {
    const path = this.buildPath(recordType, recordId, filename);
    const encoded = path
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    return `${String(this.url).replace(/\/+$/, '')}/remote.php/dav/files/${encodeURIComponent(this.user)}/${encoded}`;
  }

  async upload({ recordType, recordId, filename, content, mimeType }) {
    const nextcloud_path = this.buildPath(recordType, recordId, filename);

    if (!this.isConfigured()) {
      return {
        mode: 'offline',
        nextcloud_path,
        remote_url: null
      };
    }

    const remoteUrl = this.buildRemoteUrl(recordType, recordId, filename);
    const response = await fetch(remoteUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.user}:${this.password}`).toString('base64')}`,
        'Content-Type': mimeType || 'application/octet-stream'
      },
      body: content || Buffer.alloc(0)
    });

    if (!response.ok) {
      const error = new Error(`Nextcloud upload failed with status ${response.status}`);
      error.statusCode = 502;
      throw error;
    }

    return {
      mode: 'webdav',
      nextcloud_path,
      remote_url: remoteUrl
    };
  }

  async remove(nextcloudPath) {
    if (!this.isConfigured()) {
      return { mode: 'offline' };
    }

    const encoded = String(nextcloudPath)
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const remoteUrl = `${String(this.url).replace(/\/+$/, '')}/remote.php/dav/files/${encodeURIComponent(this.user)}/${encoded}`;
    const response = await fetch(remoteUrl, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${Buffer.from(`${this.user}:${this.password}`).toString('base64')}`
      }
    });

    if (!response.ok && response.status !== 404) {
      const error = new Error(`Nextcloud delete failed with status ${response.status}`);
      error.statusCode = 502;
      throw error;
    }

    return { mode: 'webdav', remote_url: remoteUrl };
  }
}

module.exports = {
  NextcloudClient,
  buildLocalPath,
  sanitizeFilename,
  sanitizeSegment,
  normalizeBasePath
};
