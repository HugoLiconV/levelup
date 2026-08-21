"use client";

import { useEffect, useState } from "react";
import type { AppSettings } from "../lib/levelup";
import {
  cancelRemoteMovementTimer,
  enablePushNotifications,
  getNotificationPermission,
  getNotificationTimezone,
  getRemoteMovementTimer,
  getStoredTimerEndsAt,
  isPushSupported,
  startRemoteMovementTimer,
  storeTimerEndsAt,
  unsubscribePushNotifications,
  updatePushPreferences,
} from "../lib/notifications";
import type { NotificationPermissionState } from "./shared";

type NotificationHookOptions = {
  ready: boolean;
  settings: AppSettings;
  onSettingsChange: (patch: Partial<AppSettings>) => void;
  setNotice: (message: string) => void;
};

export function useNotifications({ ready, settings, onSettingsChange, setNotice }: NotificationHookOptions) {
  const [timerEndsAt, setTimerEndsAt] = useState<number | null>(() => getStoredTimerEndsAt());
  const [now, setNow] = useState(() => Date.now());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermissionState>("default");
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setNotificationSupported(isPushSupported());
      setNotificationPermission(getNotificationPermission());
    });
    if (!ready || !isPushSupported()) return () => window.cancelAnimationFrame(frame);

    let disposed = false;
    void getRemoteMovementTimer()
      .then((remoteTimer) => {
        if (disposed) return;
        setTimerEndsAt(remoteTimer);
        storeTimerEndsAt(remoteTimer);
      })
      .catch(() => {
        // The local timer remains usable when the server is not configured or unreachable.
      });
    return () => {
      disposed = true;
      window.cancelAnimationFrame(frame);
    };
  }, [ready]);

  useEffect(() => {
    const refreshPermission = () => {
      const permission = getNotificationPermission();
      setNotificationPermission(permission);
      if (settings.reminderEnabled && permission !== "granted") {
        onSettingsChange({ reminderEnabled: false });
        setTimerEndsAt(null);
        void cancelRemoteMovementTimer().catch(() => undefined);
        void updatePushPreferences({
          reminderEnabled: false,
          reminderTime: settings.reminderTime,
          timezone: getNotificationTimezone(),
        }).catch(() => undefined);
      }
    };
    window.addEventListener("focus", refreshPermission);
    document.addEventListener("visibilitychange", refreshPermission);
    return () => {
      window.removeEventListener("focus", refreshPermission);
      document.removeEventListener("visibilitychange", refreshPermission);
    };
  }, [onSettingsChange, setNotice, settings.reminderEnabled, settings.reminderTime]);

  useEffect(() => {
    storeTimerEndsAt(timerEndsAt);
  }, [timerEndsAt]);

  useEffect(() => {
    if (!ready || !notificationSupported || !settings.reminderEnabled) return;
    const handleSubscriptionChange = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type !== "PUSH_SUBSCRIPTION_CHANGED") return;
      void enablePushNotifications({
        reminderEnabled: true,
        reminderTime: settings.reminderTime,
        timezone: getNotificationTimezone(),
      }).catch(() => undefined);
    };
    navigator.serviceWorker?.addEventListener("message", handleSubscriptionChange);
    return () => navigator.serviceWorker?.removeEventListener("message", handleSubscriptionChange);
  }, [notificationSupported, ready, settings.reminderEnabled, settings.reminderTime]);

  useEffect(() => {
    if (!timerEndsAt) return;
    const interval = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= timerEndsAt) {
        void cancelRemoteMovementTimer().catch(() => undefined);
        setTimerEndsAt(null);
        setNotice("Es buen momento para levantarte y moverte un poco");
      }
    }, 30000);
    return () => window.clearInterval(interval);
  }, [settings.reminderEnabled, setNotice, timerEndsAt]);

  const toggleReminders = async (enabled: boolean) => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      const preferences = {
        reminderEnabled: enabled,
        reminderTime: settings.reminderTime,
        timezone: getNotificationTimezone(),
      };
      if (enabled) {
        const permission = await enablePushNotifications(preferences);
        setNotificationPermission(permission);
        if (permission !== "granted") {
          setNotice(permission === "denied" ? "Las notificaciones están bloqueadas en este dispositivo" : "No activamos las notificaciones");
          return;
        }
        if (timerEndsAt && timerEndsAt > Date.now()) {
          const remainingSeconds = Math.ceil((timerEndsAt - Date.now()) / 1000);
          if (remainingSeconds >= 60) await startRemoteMovementTimer(remainingSeconds);
        }
        onSettingsChange({ reminderEnabled: true });
        setNotice("Recordatorios activados en este dispositivo");
      } else {
        let serverError: Error | null = null;
        try {
          await updatePushPreferences(preferences);
        } catch (error) {
          serverError = error instanceof Error ? error : new Error("No pudimos sincronizar el cambio");
        }
        await cancelRemoteMovementTimer().catch(() => undefined);
        setTimerEndsAt(null);
        onSettingsChange({ reminderEnabled: false });
        setNotice(serverError ? "Recordatorios pausados en este dispositivo" : "Recordatorios pausados");
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No pudimos configurar las notificaciones");
    } finally {
      setNotificationBusy(false);
    }
  };

  const updateReminderTime = (reminderTime: string) => {
    onSettingsChange({ reminderTime });
    if (settings.reminderEnabled) {
      void updatePushPreferences({
        reminderEnabled: true,
        reminderTime,
        timezone: getNotificationTimezone(),
      }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : "No pudimos guardar la hora"));
    }
  };

  const unsubscribeNotifications = async () => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      let serverError: Error | null = null;
      try {
        await unsubscribePushNotifications();
      } catch (error) {
        serverError = error instanceof Error ? error : new Error("No pudimos cancelar las notificaciones en el servidor");
      }
      await cancelRemoteMovementTimer().catch(() => undefined);
      setTimerEndsAt(null);
      onSettingsChange({ reminderEnabled: false });
      setNotificationPermission(getNotificationPermission());
      setNotice(serverError ? "Notificaciones quitadas de este dispositivo; el servidor se actualizará al volver a conectarte" : "Este dispositivo ya no recibirá recordatorios");
    } finally {
      setNotificationBusy(false);
    }
  };

  const startTimer = () => {
    const localEndsAt = Date.now() + 45 * 60 * 1000;
    setTimerEndsAt(localEndsAt);
    setNow(Date.now());
    setNotice("Temporizador listo · te aviso en 45 min");
    if (settings.reminderEnabled) {
      void startRemoteMovementTimer().catch((error: unknown) => {
        setNotice(error instanceof Error ? `${error.message} · El temporizador local sigue activo` : "El temporizador local sigue activo");
      });
    }
  };

  return {
    timerEndsAt,
    timerMinutes: timerEndsAt ? Math.max(0, Math.ceil((timerEndsAt - now) / 60000)) : 45,
    notificationPermission,
    notificationSupported,
    notificationBusy,
    toggleReminders,
    updateReminderTime,
    unsubscribeNotifications,
    startTimer,
  };
}

