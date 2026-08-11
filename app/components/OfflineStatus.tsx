"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icons";

type ServiceWorkerWithState = ServiceWorker & { state: ServiceWorkerState };

export function OfflineStatus() {
  const [isOffline, setIsOffline] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const updateAcceptedRef = useRef(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const updateConnection = () => setIsOffline(!navigator.onLine);
    const handleControllerChange = () => {
      if (updateAcceptedRef.current) window.location.reload();
    };

    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    navigator.serviceWorker?.addEventListener("controllerchange", handleControllerChange);

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;

    const markWaitingWorker = () => {
      if (!disposed && registration?.waiting && navigator.serviceWorker.controller) {
        setUpdateAvailable(true);
      }
    };

    const watchInstallingWorker = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        const state = (worker as ServiceWorkerWithState).state;
        if (state === "installed") markWaitingWorker();
      });
    };

    const register = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (disposed) return;
        registrationRef.current = registration;
        registration.addEventListener("updatefound", () => watchInstallingWorker(registration?.installing ?? null));
        watchInstallingWorker(registration.installing);
        markWaitingWorker();
        await registration.update();
        markWaitingWorker();
      } catch {
        // The app remains usable without a service worker when the browser blocks registration.
      }
    };

    void register();

    return () => {
      disposed = true;
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      navigator.serviceWorker?.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  const retry = () => window.location.reload();

  const activateUpdate = () => {
    updateAcceptedRef.current = true;
    registrationRef.current?.waiting?.postMessage({ type: "ACTIVATE_UPDATE" });
  };

  if (!isOffline && !updateAvailable) return null;

  const showingUpdate = updateAvailable && !isOffline;
  return (
    <div className="offline-status" role="status" aria-live="polite">
      <span className="offline-status-icon"><Icon name={showingUpdate ? "refresh" : "info"} size={17} /></span>
      <span className="offline-status-copy">
        <strong>{showingUpdate ? "Hay una actualización disponible" : "Estás sin conexión"}</strong>
        <small>{showingUpdate ? "Tus datos locales seguirán aquí." : "Puedes seguir registrando tu progreso."}</small>
      </span>
      <button className="offline-status-action" type="button" onClick={showingUpdate ? activateUpdate : retry}>
        {showingUpdate ? "Actualizar" : "Reintentar"}
      </button>
    </div>
  );
}
