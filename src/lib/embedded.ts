/**
 * Detect when the builder is the Home Assistant sidebar iframe and talk to the
 * already signed-in session. Standalone mode never takes this path.
 */

export interface EmbeddedHass {
  callWS: (message: Record<string, unknown>) => Promise<unknown>;
}

export interface EmbeddedWindow {
  parent?: EmbeddedWindow | null;
  document?: { querySelector?: (selector: string) => { hass?: ParentHass } | null };
  hass?: ParentHass;
  hassConnection?: ParentConnection | Promise<ParentConnection>;
}

interface ParentHass {
  callWS?: (message: Record<string, unknown>) => Promise<unknown>;
  connection?: ParentConnection;
}

interface ParentConnection {
  sendMessagePromise?: (message: Record<string, unknown>) => Promise<unknown>;
}

export function isSameOriginFrame(win: EmbeddedWindow): boolean {
  try {
    return Boolean(win.parent && win.parent !== win && win.parent.document);
  } catch {
    return false;
  }
}

export function findEmbeddedHass(win: EmbeddedWindow): EmbeddedHass | null {
  try {
    if (!win.parent || win.parent === win) return null;
    const parent = win.parent;
    const element = parent.document?.querySelector?.("home-assistant");
    const hass = element?.hass ?? parent.hass;
    if (hass && typeof hass.callWS === "function") {
      return { callWS: (message) => hass.callWS!(message) };
    }
    const connection = hass?.connection;
    if (connection && typeof connection.sendMessagePromise === "function") {
      return { callWS: (message) => connection.sendMessagePromise!(message) };
    }
  } catch {
    return null;
  }
  return null;
}

export async function resolveEmbeddedHass(win: EmbeddedWindow): Promise<EmbeddedHass | null> {
  const direct = findEmbeddedHass(win);
  if (direct) return direct;
  try {
    if (!win.parent || win.parent === win) return null;
    const pending = win.parent.hassConnection;
    if (!pending) return null;
    const connection = await pending;
    if (connection && typeof connection.sendMessagePromise === "function") {
      return { callWS: (message) => connection.sendMessagePromise!(message) };
    }
  } catch {
    return null;
  }
  return null;
}

export function saveThemeMessage(input: {
  filename: string;
  yaml: string;
  imageFilename?: string;
  imageBase64?: string;
  setForUser?: boolean;
  dark?: boolean;
}): Record<string, unknown> {
  return {
    type: "omarchy_themes/save",
    filename: input.filename,
    yaml: input.yaml,
    image_filename: input.imageFilename,
    image_base64: input.imageBase64,
    activate: false,
    set_for_user: Boolean(input.setForUser),
    dark: Boolean(input.dark),
  };
}

/** Persists the theme on the signed-in user, not the system default. */
export function userThemeMessage(themeName: string, dark: boolean): Record<string, unknown> {
  return {
    type: "frontend/set_user_data",
    key: "theme",
    value: { theme: themeName, dark },
  };
}
