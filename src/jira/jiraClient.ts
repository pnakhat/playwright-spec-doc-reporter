/**
 * Minimal Jira Cloud REST API v3 client — no external dependencies.
 */
import fs from "node:fs";
import path from "node:path";

export interface JiraClientOptions {
  baseUrl: string;   // e.g. https://yourorg.atlassian.net
  email: string;
  apiToken: string;
}

export interface JiraAttachment {
  id: string;
  filename: string;
  /** Direct download URL — requires session auth (same-origin browser requests work). */
  contentUrl: string;
}

export class JiraClient {
  private readonly auth: string;
  private readonly baseUrl: string;

  constructor(opts: JiraClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, "");
    this.auth = Buffer.from(`${opts.email}:${opts.apiToken}`).toString("base64");
  }

  async addComment(issueKey: string, adfBody: unknown): Promise<void> {
    const url = `${this.baseUrl}/rest/api/3/issue/${issueKey}/comment`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${this.auth}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ body: adfBody }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Jira comment POST failed for ${issueKey}: ${res.status} ${res.statusText} — ${text}`);
    }
  }

  /**
   * Returns the age in milliseconds of the most recent comment on the issue
   * that was authored by the authenticated account, or Infinity if none found.
   * Used to enforce commentCooldownMs.
   */
  async lastOwnCommentAgeMs(issueKey: string): Promise<number> {
    const url = `${this.baseUrl}/rest/api/3/issue/${issueKey}/comment?maxResults=50&orderBy=-created`;
    const res = await fetch(url, {
      headers: {
        "Authorization": `Basic ${this.auth}`,
        "Accept": "application/json",
      },
    });
    if (!res.ok) return Infinity;
    const data = await res.json() as { comments?: { author?: { emailAddress?: string }; created?: string }[] };
    // Decode email from auth (base64 "email:token")
    const email = Buffer.from(this.auth, "base64").toString("utf8").split(":")[0];
    const ownComments = (data.comments ?? []).filter(c => c.author?.emailAddress === email);
    if (ownComments.length === 0) return Infinity;
    const latest = new Date(ownComments[0].created ?? 0).getTime();
    return Date.now() - latest;
  }

  /**
   * Upload a local file as an attachment to a Jira issue.
   * Returns the attachment metadata including a direct content URL.
   */
  async uploadAttachment(issueKey: string, filePath: string): Promise<JiraAttachment> {
    const url = `${this.baseUrl}/rest/api/3/issue/${issueKey}/attachments`;
    const filename = path.basename(filePath);
    const fileBuffer = fs.readFileSync(filePath);

    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer], { type: "image/png" }), filename);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${this.auth}`,
        "X-Atlassian-Token": "no-check",
        "Accept": "application/json",
      },
      body: formData,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Jira attachment upload failed for ${issueKey}/${filename}: ${res.status} — ${text}`);
    }

    const data = await res.json() as Array<{ id: string; filename: string; content: string }>;
    const att = data[0];
    return { id: att.id, filename: att.filename, contentUrl: att.content };
  }
}
