import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationSetting } from "@/lib/apiClient";

/**
 * Per-room chat preferences, persisted for the signed-in user.
 *
 * Storage strategy:
 *   1. localStorage — instant read on mount, so the UI never flashes defaults.
 *   2. NotificationSetting.preferences.chat_rooms[roomId] — the durable copy,
 *      so preferences follow the user to another device or browser.
 *
 * The server row is owned by the caller: the API scopes NotificationSetting by
 * user_id, so one user can neither read nor overwrite another's preferences.
 *
 * A server failure is never fatal — the local copy still applies and the caller
 * is told through `error` so it can surface a retry.
 */
export const DEFAULT_CHAT_SETTINGS = Object.freeze({
  notificationsEnabled: true,
  soundEnabled: true,
  desktopNotifications: false,
  showTypingIndicator: true,
  showReadReceipts: true,
  compactMode: false,
  autoScroll: true,
  enterToSend: true,
  showTimestamps: true,
});

const SETTINGS_EVENT = "chat-settings-updated";
const storageKey = (roomId) => `chat_settings_${roomId}`;

/** localStorage throws in private mode / blocked storage; never let that break the UI. */
const readLocal = (roomId) => {
  try {
    const raw = localStorage.getItem(storageKey(roomId));
    return raw ? { ...DEFAULT_CHAT_SETTINGS, ...JSON.parse(raw) } : null;
  } catch {
    return null;
  }
};

const writeLocal = (roomId, value) => {
  try {
    localStorage.setItem(storageKey(roomId), JSON.stringify(value));
  } catch {
    /* quota or blocked storage — the server copy is still authoritative */
  }
};

/** Only known keys are persisted, so a stale/tampered payload cannot inject fields. */
const sanitise = (raw) => {
  const out = { ...DEFAULT_CHAT_SETTINGS };
  if (raw && typeof raw === "object") {
    for (const key of Object.keys(DEFAULT_CHAT_SETTINGS)) {
      if (typeof raw[key] === "boolean") out[key] = raw[key];
    }
  }
  return out;
};

export default function useChatRoomSettings(roomId) {
  const [settings, setSettings] = useState(
    () => readLocal(roomId) || { ...DEFAULT_CHAT_SETTINGS }
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // The server row id, so we update instead of creating duplicates.
  const rowRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /** Pull the durable copy and reconcile it over the local one. */
  const load = useCallback(async () => {
    if (!roomId) return;
    setIsLoading(true);
    try {
      const rows = await NotificationSetting.list("created_at", 1, 0);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!mountedRef.current) return;

      rowRef.current = row?.id ?? null;
      const remote = row?.preferences?.chat_rooms?.[roomId];
      if (remote) {
        const merged = sanitise(remote);
        setSettings(merged);
        writeLocal(roomId, merged);
      }
      setError(null);
    } catch {
      if (mountedRef.current) {
        setError("Saved preferences could not be loaded. Local settings are in use.");
      }
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => { load(); }, [load]);

  // Keep every mounted consumer of this room in step.
  useEffect(() => {
    const onUpdate = () => {
      const local = readLocal(roomId);
      if (local) setSettings(local);
    };
    window.addEventListener(SETTINGS_EVENT, onUpdate);
    return () => window.removeEventListener(SETTINGS_EVENT, onUpdate);
  }, [roomId]);

  /** Write one key through to local storage and the server. */
  const updateSetting = useCallback(
    async (key, value) => {
      if (!(key in DEFAULT_CHAT_SETTINGS)) return { ok: false, error: "Unknown setting" };

      const next = { ...settings, [key]: value };
      // Optimistic: the control reflects the change immediately.
      setSettings(next);
      writeLocal(roomId, next);
      window.dispatchEvent(new Event(SETTINGS_EVENT));

      setIsSaving(true);
      try {
        const existingId = rowRef.current;
        if (existingId) {
          const current = await NotificationSetting.get(existingId);
          const prefs = { ...(current?.preferences || {}) };
          prefs.chat_rooms = { ...(prefs.chat_rooms || {}), [roomId]: next };
          await NotificationSetting.update(existingId, { preferences: prefs });
        } else {
          const created = await NotificationSetting.create({
            email_enabled: true,
            push_enabled: true,
            sms_enabled: false,
            preferences: { chat_rooms: { [roomId]: next } },
          });
          rowRef.current = created?.id ?? null;
        }
        if (mountedRef.current) setError(null);
        return { ok: true };
      } catch (e) {
        const message =
          e?.response?.data?.error || "Could not save to your account. Applied on this device only.";
        if (mountedRef.current) setError(message);
        return { ok: false, error: message };
      } finally {
        if (mountedRef.current) setIsSaving(false);
      }
    },
    [roomId, settings]
  );

  const resetSettings = useCallback(async () => {
    const defaults = { ...DEFAULT_CHAT_SETTINGS };
    setSettings(defaults);
    writeLocal(roomId, defaults);
    window.dispatchEvent(new Event(SETTINGS_EVENT));

    setIsSaving(true);
    try {
      const existingId = rowRef.current;
      if (existingId) {
        const current = await NotificationSetting.get(existingId);
        const prefs = { ...(current?.preferences || {}) };
        prefs.chat_rooms = { ...(prefs.chat_rooms || {}), [roomId]: defaults };
        await NotificationSetting.update(existingId, { preferences: prefs });
      }
      if (mountedRef.current) setError(null);
      return { ok: true };
    } catch (e) {
      const message = e?.response?.data?.error || "Reset applied on this device only.";
      if (mountedRef.current) setError(message);
      return { ok: false, error: message };
    } finally {
      if (mountedRef.current) setIsSaving(false);
    }
  }, [roomId]);

  return { settings, updateSetting, resetSettings, isLoading, isSaving, error, reload: load };
}
