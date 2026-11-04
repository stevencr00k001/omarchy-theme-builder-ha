"use client";

import { useEffect, useRef, useState } from "react";
import { teshUrl } from "@/lib/links";
import {
  HaCommandError,
  HaSocket,
  REMEMBER_WARNING,
  assertSafeImageFilename,
  assertSafeThemeFilename,
  bytesToBase64,
  connectionBlockReason,
  finishOauth,
  forgetSavedConnection,
  loadSavedConnection,
  normalizeHaUrl,
  refreshAccessToken,
  replaceExtension,
  rewriteLovelaceBackground,
  saveConnection,
  shrinkForPush,
  startOauth,
  type SavedConnection,
} from "@/lib/ha-connect";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface HaConnectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingOauth: { code: string; state: string } | null;
  onOauthSettled: () => void;
  yaml: string;
  themeFilename: string;
  loadImage: () => Promise<{ bytes: Uint8Array; filename: string; mime: string } | null>;
}

type Phase = "form" | "connected" | "missing" | "pushed";

export function HaConnectDialog({
  open,
  onOpenChange,
  pendingOauth,
  onOauthSettled,
  yaml,
  themeFilename,
  loadImage,
}: HaConnectDialogProps) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [remember, setRemember] = useState(false);
  const [activate, setActivate] = useState(false);
  const [connection, setConnection] = useState<SavedConnection | null>(null);
  const [phase, setPhase] = useState<Phase>("form");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const saved = loadSavedConnection();
    if (saved) {
      setUrl(saved.haUrl);
      setConnection(saved);
    }
  }, []);

  const oauthStarted = useRef(false);
  useEffect(() => {
    if (!pendingOauth || oauthStarted.current) return;
    oauthStarted.current = true;
    let cancel = false;
    setBusy(true);
    setError(null);
    void finishOauth(pendingOauth.code, pendingOauth.state)
      .then(async (saved) => {
        if (cancel) return;
        setConnection(saved);
        setUrl(saved.haUrl);
        await inspect(saved);
      })
      .catch((cause: unknown) => {
        if (!cancel) setError(cause instanceof Error ? cause.message : "Sign-in did not finish.");
      })
      .finally(() => {
        if (!cancel) {
          setBusy(false);
          onOauthSettled();
        }
      });
    return () => {
      cancel = true;
    };
  }, [pendingOauth, onOauthSettled]);

  async function inspect(saved: SavedConnection) {
    const blocked = connectionBlockReason(window.location.protocol, saved.haUrl);
    if (blocked) {
      setError(blocked);
      setPhase("form");
      return;
    }
    let current = saved;
    if (current.expiresAt && current.expiresAt < Date.now() + 60_000 && current.refreshToken) {
      current = await refreshAccessToken(current);
      setConnection(current);
    }
    const socket = await HaSocket.connect(current.haUrl, current.accessToken, window.location.protocol);
    try {
      await socket.command("omarchy_themes/status");
      setPhase("connected");
      setMessage(`Connected to ${current.haUrl}. The companion integration is ready.`);
    } catch (cause) {
      if (cause instanceof HaCommandError && cause.code === "unknown_command") {
        setPhase("missing");
        setMessage(`Signed in to ${current.haUrl}. The companion integration is not set up yet.`);
        return;
      }
      if (cause instanceof HaCommandError && cause.code === "unauthorized") {
        setError("That account is not an administrator, so it cannot write theme files.");
        setPhase("form");
        return;
      }
      throw cause;
    } finally {
      socket.close();
    }
  }

  async function signIn() {
    setError(null);
    const normalized = normalizeHaUrl(url);
    if ("error" in normalized) {
      setError(normalized.error);
      return;
    }
    const blocked = connectionBlockReason(window.location.protocol, normalized.url);
    if (blocked) {
      setError(blocked);
      return;
    }
    setBusy(true);
    try {
      await startOauth(normalized.url, remember);
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : "Could not start sign-in.");
    }
  }

  async function connectWithToken() {
    setError(null);
    const normalized = normalizeHaUrl(url);
    if ("error" in normalized) {
      setError(normalized.error);
      return;
    }
    if (token.trim().length < 20) {
      setError("Paste a long-lived access token from your Home Assistant profile.");
      return;
    }
    const saved: SavedConnection = {
      haUrl: normalized.url,
      accessToken: token.trim(),
      clientId: `${window.location.origin}/`,
      via: "token",
    };
    setBusy(true);
    try {
      if (remember) saveConnection(saved);
      setConnection(saved);
      setToken("");
      await inspect(saved);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }

  function forget() {
    forgetSavedConnection();
    setConnection(null);
    setPhase("form");
    setMessage(null);
    setToken("");
  }

  async function push() {
    if (!connection) return;
    setBusy(true);
    setError(null);
    try {
      assertSafeThemeFilename(themeFilename);
      let nextYaml = yaml;
      let imageFilename: string | undefined;
      let imageBase64: string | undefined;
      const image = await loadImage();
      if (image) {
        const shrunk = await shrinkForPush(image.bytes, image.mime);
        imageFilename = replaceExtension(image.filename, shrunk.extension);
        assertSafeImageFilename(imageFilename);
        imageBase64 = bytesToBase64(shrunk.bytes);
        nextYaml = rewriteLovelaceBackground(yaml, imageFilename);
      }
      const socket = await HaSocket.connect(connection.haUrl, connection.accessToken, window.location.protocol);
      try {
        const result = (await socket.command("omarchy_themes/save", {
          filename: themeFilename,
          yaml: nextYaml,
          image_filename: imageFilename,
          image_base64: imageBase64,
          activate,
        })) as { theme_name?: string; activated?: boolean };
        setPhase("pushed");
        setMessage(
          result.activated
            ? `Saved “${result.theme_name}” and set it as the default theme. A theme chosen in your profile still overrides the default.`
            : `Saved “${result.theme_name}” and reloaded themes. Pick it in your profile.`,
        );
      } finally {
        socket.close();
      }
    } catch (cause) {
      if (cause instanceof HaCommandError && cause.code === "unknown_command") {
        setPhase("missing");
        setMessage("The companion integration is not set up on that Home Assistant.");
      } else {
        setError(cause instanceof Error ? cause.message : "Could not push the theme.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect to Home Assistant</DialogTitle>
          <DialogDescription>
            The browser talks to your hub directly. Nothing is sent through Top End Smart Homes.
            Home Assistant cannot write theme files on its own, so this needs the Omarchy Themes
            companion integration.
          </DialogDescription>
        </DialogHeader>

        {phase === "form" ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ha-url">Home Assistant URL</Label>
              <Input
                id="ha-url"
                className="mt-1"
                placeholder="https://home.example"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <Button type="button" onClick={() => void signIn()} disabled={busy}>
              {busy ? "Opening sign-in…" : "Sign in with Home Assistant"}
            </Button>
            <p className="text-xs text-[#4d5e62]">
              This uses Home Assistant’s own sign-in. You approve it on your hub, and the browser
              exchanges the code directly with it.
            </p>
            <div className="border-t border-[#e3dccf] pt-3">
              <Label htmlFor="ha-token">Or paste a long-lived access token</Label>
              <Input
                id="ha-token"
                className="mt-1"
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-[#4d5e62]">
                Create one in your profile, under Security. It stays in this page unless you choose
                to remember it.
              </p>
              <Button type="button" variant="outline" className="mt-2" onClick={() => void connectWithToken()} disabled={busy}>
                Use token
              </Button>
            </div>
            <div className="rounded-xl bg-[#f3eee4] p-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="ha-remember">Remember on this browser</Label>
                <Switch id="ha-remember" checked={remember} onCheckedChange={setRemember} />
              </div>
              <p className="mt-2 text-xs text-[#4d5e62]">{REMEMBER_WARNING}</p>
            </div>
          </div>
        ) : null}

        {phase === "connected" || phase === "missing" || phase === "pushed" ? (
          <div className="space-y-3 text-sm">
            {message ? <p>{message}</p> : null}
            {phase === "connected" ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="ha-activate">Set as the default theme</Label>
                  <Switch id="ha-activate" checked={activate} onCheckedChange={setActivate} />
                </div>
                <Button type="button" onClick={() => void push()} disabled={busy}>
                  {busy ? "Pushing…" : "Push this theme"}
                </Button>
              </>
            ) : null}
            {phase === "missing" ? <InstallHelp /> : null}
            {phase === "pushed" ? (
              <div className="rounded-xl border border-[#e3dccf] bg-[#fbf6ee] p-3">
                <p className="font-medium">Want the dashboard laid out already?</p>
                <p className="mt-1 text-[#4d5e62]">
                  Top End Smart Homes publishes ready-made dashboard kits, and tutorials if you are
                  setting a hub up yourself.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href={teshUrl("/kits", "ha-push-kits")} className={buttonVariants()} rel="noopener noreferrer">
                    Dashboard kits
                  </a>
                  <a href={teshUrl("/tutorials", "ha-push-tutorials")} className={buttonVariants({ variant: "outline" })} rel="noopener noreferrer">
                    Tutorials
                  </a>
                </div>
              </div>
            ) : null}
            <Button type="button" variant="outline" onClick={forget}>
              Forget this connection
            </Button>
          </div>
        ) : null}

        {connection && phase === "form" ? (
          <Button type="button" variant="outline" onClick={() => void inspect(connection).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not connect."))}>
            Use the saved connection
          </Button>
        ) : null}

        {error ? <p className="text-sm text-[#9f2d2d]">{error}</p> : null}
      </DialogContent>
    </Dialog>
  );
}

function InstallHelp() {
  return (
    <ol className="list-decimal space-y-2 pl-4 text-sm text-[#17262a]">
      <li>
        In HACS, open Integrations, then Custom repositories. Add this project’s repository and
        choose Integration.
      </li>
      <li>Download Omarchy Themes and restart Home Assistant.</li>
      <li>
        Go to Settings, Devices & services, Add integration, and choose Omarchy Themes. Or add{" "}
        <span className="font-mono">omarchy_themes:</span> to configuration.yaml and restart.
      </li>
      <li>Come back here and push the theme again.</li>
    </ol>
  );
}
