/**
 * Browser-to-Home Assistant connection.
 * Tokens stay in this page. Nothing is sent to Top End Smart Homes.
 */

export const MAX_PUSH_IMAGE_BYTES = 2_500_000;

export const THEME_FILENAME = /^omarchy-[a-z0-9]+(?:-[a-z0-9]+)*\.yaml$/;
export const IMAGE_FILENAME = /^[a-z0-9][a-z0-9._-]{0,80}\.(?:webp|png|jpe?g)$/;

export const REMEMBER_WARNING =
  "Remember on this browser stores the access token in local storage on this device. Anyone who can use this browser profile can push themes to your Home Assistant. Leave this off on a shared computer. The token is never sent to Top End Smart Homes.";

const STORAGE_KEY = "omarchy-theme-builder-ha";
const OAUTH_KEY = "omarchy-theme-builder-oauth";

export interface SavedConnection {
  haUrl: string;
  accessToken: string;
  refreshToken?: string;
  clientId: string;
  expiresAt?: number;
  via: "oauth" | "token";
}

interface OauthPending {
  haUrl: string;
  verifier: string;
  state: string;
  remember: boolean;
  clientId: string;
}

export class HaCommandError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function normalizeHaUrl(input: string): { url: string } | { error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { error: "Enter your Home Assistant URL." };
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { error: "That Home Assistant URL is not valid." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { error: "Use an http:// or https:// Home Assistant URL." };
  }
  if (url.username || url.password) {
    return { error: "Don't put a username or password in the Home Assistant URL." };
  }
  return { url: url.origin };
}

export function connectionBlockReason(pageProtocol: string, haUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(haUrl);
  } catch {
    return "Enter a full Home Assistant URL, including https://.";
  }
  const page = pageProtocol.replace(":", "");
  if (page === "https" && url.protocol === "http:") {
    const local = url.hostname === "homeassistant.local" || url.hostname.endsWith(".local");
    return `This page is HTTPS, so the browser blocks a connection to an http:// Home Assistant address${local ? " (including homeassistant.local)" : ""}. Use your hub's HTTPS address, or download the YAML instead.`;
  }
  return null;
}

export function assertSafeThemeFilename(filename: string): void {
  if (!THEME_FILENAME.test(filename) || filename.includes("..")) {
    throw new HaCommandError("invalid_filename", "Theme filename was not accepted.");
  }
}

export function assertSafeImageFilename(filename: string): void {
  if (!IMAGE_FILENAME.test(filename) || filename.includes("..")) {
    throw new HaCommandError("invalid_image", "Wallpaper filename was not accepted.");
  }
}

export function rewriteLovelaceBackground(yaml: string, imageFile: string | null): string {
  if (!imageFile) return yaml;
  assertSafeImageFilename(imageFile);
  const css = `center / cover no-repeat fixed url(\\"/local/omarchy/${imageFile}\\")`;
  return yaml.replace(/lovelace-background:\s*"(?:\\.|[^"\\])*"/, `lovelace-background: "${css}"`);
}

export function buildAuthorizeUrl(input: {
  haUrl: string;
  clientId: string;
  redirectUri: string;
  state: string;
  codeChallenge: string;
}): string {
  const url = new URL("/auth/authorize", input.haUrl);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("state", input.state);
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export function clientIdFromOrigin(origin: string): string {
  return origin.endsWith("/") ? origin : `${origin}/`;
}

export async function codeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const size = 0x8000;
  for (let index = 0; index < bytes.length; index += size) {
    binary += String.fromCharCode(...bytes.subarray(index, index + size));
  }
  return btoa(binary);
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

export function loadSavedConnection(): SavedConnection | null {
  if (typeof localStorage === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedConnection;
    if (!parsed.haUrl || !parsed.accessToken || !parsed.clientId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveConnection(value: SavedConnection): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function forgetSavedConnection(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function startOauth(haUrl: string, remember: boolean): Promise<void> {
  const state = randomToken();
  const verifier = randomToken();
  const challenge = await codeChallenge(verifier);
  const clientId = clientIdFromOrigin(window.location.origin);
  const pending: OauthPending = { haUrl, verifier, state, remember, clientId };
  sessionStorage.setItem(OAUTH_KEY, JSON.stringify(pending));
  window.location.assign(
    buildAuthorizeUrl({
      haUrl,
      clientId,
      redirectUri: clientId,
      state,
      codeChallenge: challenge,
    }),
  );
}

const oauthInflight = new Map<string, Promise<SavedConnection>>();

export function finishOauth(code: string, state: string): Promise<SavedConnection> {
  const existing = oauthInflight.get(code);
  if (existing) return existing;
  const promise = finishOauthOnce(code, state).finally(() => {
    oauthInflight.delete(code);
  });
  oauthInflight.set(code, promise);
  return promise;
}

async function finishOauthOnce(code: string, state: string): Promise<SavedConnection> {
  const raw = sessionStorage.getItem(OAUTH_KEY);
  if (!raw) throw new Error("That sign-in session expired. Start it again from this browser.");
  const pending = JSON.parse(raw) as OauthPending;
  if (pending.state !== state) {
    throw new Error("The sign-in response did not match this browser. Start it again.");
  }
  const tokens = await exchangeAuthorizationCode(pending.haUrl, pending.clientId, code, pending.verifier);
  sessionStorage.removeItem(OAUTH_KEY);
  const saved: SavedConnection = {
    haUrl: pending.haUrl,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    clientId: pending.clientId,
    expiresAt: Date.now() + tokens.expires_in * 1000,
    via: "oauth",
  };
  if (pending.remember) saveConnection(saved);
  return saved;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}

async function exchangeAuthorizationCode(
  haUrl: string,
  clientId: string,
  code: string,
  verifier: string,
): Promise<TokenResponse> {
  return postToken(haUrl, {
    grant_type: "authorization_code",
    code,
    client_id: clientId,
    code_verifier: verifier,
  });
}

export async function refreshAccessToken(saved: SavedConnection): Promise<SavedConnection> {
  if (!saved.refreshToken) return saved;
  const tokens = await postToken(saved.haUrl, {
    grant_type: "refresh_token",
    refresh_token: saved.refreshToken,
    client_id: saved.clientId,
  });
  const next: SavedConnection = {
    ...saved,
    accessToken: tokens.access_token,
    expiresAt: Date.now() + tokens.expires_in * 1000,
  };
  if (loadSavedConnection()?.haUrl === saved.haUrl) saveConnection(next);
  return next;
}

async function postToken(haUrl: string, fields: Record<string, string>): Promise<TokenResponse> {
  let response: Response;
  try {
    response = await fetch(`${haUrl}/auth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(fields),
    });
  } catch {
    throw new Error(
      "The browser could not reach the Home Assistant sign-in endpoint. Check the URL, or paste a long-lived access token instead.",
    );
  }
  if (!response.ok) {
    throw new Error("Home Assistant did not accept the sign-in. Try again, or paste a long-lived access token.");
  }
  return (await response.json()) as TokenResponse;
}

export function websocketUrl(haUrl: string): string {
  return `${haUrl.replace(/^http/, "ws")}/api/websocket`;
}

interface Waiter {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

export class HaSocket {
  private nextId = 1;
  private pending = new Map<number, Waiter>();

  private constructor(private socket: WebSocket) {
    socket.addEventListener("message", (event) => {
      const data = JSON.parse(String(event.data)) as {
        id?: number;
        type?: string;
        success?: boolean;
        result?: unknown;
        error?: { code?: string; message?: string };
      };
      if (data.type !== "result" || typeof data.id !== "number") return;
      const waiter = this.pending.get(data.id);
      if (!waiter) return;
      this.pending.delete(data.id);
      if (data.success) waiter.resolve(data.result);
      else {
        waiter.reject(
          new HaCommandError(data.error?.code ?? "error", data.error?.message ?? "Home Assistant rejected the command."),
        );
      }
    });
    socket.addEventListener("close", () => {
      for (const waiter of this.pending.values()) {
        waiter.reject(new Error("The Home Assistant connection closed."));
      }
      this.pending.clear();
    });
  }

  static connect(haUrl: string, token: string, pageProtocol: string): Promise<HaSocket> {
    const blocked = connectionBlockReason(pageProtocol, haUrl);
    if (blocked) return Promise.reject(new Error(blocked));
    const socket = new WebSocket(websocketUrl(haUrl));
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        socket.close();
        reject(new Error("Home Assistant did not answer. Check the URL and that this browser can open it."));
      }, 10000);
      const fail = (message: string) => {
        window.clearTimeout(timeout);
        socket.close();
        reject(new Error(message));
      };
      socket.addEventListener("error", () => {
        fail("Could not open a connection to Home Assistant.");
      });
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(String(event.data)) as { type?: string };
        if (data.type === "auth_required") {
          socket.send(JSON.stringify({ type: "auth", access_token: token }));
          return;
        }
        if (data.type === "auth_ok") {
          window.clearTimeout(timeout);
          resolve(new HaSocket(socket));
          return;
        }
        if (data.type === "auth_invalid") {
          fail("Home Assistant rejected that access token.");
        }
      });
    });
  }

  command(type: string, payload: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId;
    this.nextId += 1;
    const body = JSON.stringify({ id, type, ...payload });
    if (body.length > 3_700_000) {
      return Promise.reject(
        new HaCommandError("too_large", "This theme is too large to push. Download the zip instead."),
      );
    }
    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("Home Assistant took too long to answer."));
      }, 30000);
      this.pending.set(id, {
        resolve: (value) => {
          window.clearTimeout(timeout);
          resolve(value);
        },
        reject: (error) => {
          window.clearTimeout(timeout);
          reject(error);
        },
      });
      this.socket.send(body);
    });
  }

  close() {
    this.socket.close();
  }
}

export async function shrinkForPush(
  bytes: Uint8Array,
  mime: string,
): Promise<{ bytes: Uint8Array; extension: string }> {
  const extension = extensionForMime(mime);
  if (bytes.byteLength <= MAX_PUSH_IMAGE_BYTES) return { bytes, extension };
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  const blob = new Blob([copy], { type: mime || "application/octet-stream" });
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser could not resize the wallpaper.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const output = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error("Could not resize the wallpaper."))),
      "image/jpeg",
      0.82,
    );
  });
  const shrunk = new Uint8Array(await output.arrayBuffer());
  if (shrunk.byteLength > MAX_PUSH_IMAGE_BYTES) {
    throw new HaCommandError(
      "too_large",
      "The wallpaper is still too large to push. Download the zip, which keeps the original file.",
    );
  }
  return { bytes: shrunk, extension: "jpg" };
}

function extensionForMime(mime: string): string {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("avif")) return "avif";
  return "jpg";
}

export function replaceExtension(filename: string, extension: string): string {
  return filename.replace(/\.[a-z0-9]+$/i, `.${extension}`);
}
