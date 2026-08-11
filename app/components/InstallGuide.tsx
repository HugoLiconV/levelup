"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icons";

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

function isAppleMobileDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function InstallGuide() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const updateVisibility = () => {
      const isStandalone = displayMode.matches
        || Boolean((navigator as NavigatorWithStandalone).standalone);
      setShouldShow(isAppleMobileDevice() && !isStandalone);
    };

    updateVisibility();
    displayMode.addEventListener("change", updateVisibility);
    return () => displayMode.removeEventListener("change", updateVisibility);
  }, []);

  if (!shouldShow) return null;

  return (
    <section className="install-guide" aria-labelledby="install-guide-title">
      <span className="install-guide-icon"><Icon name="sparkles" size={22} /></span>
      <div className="install-guide-copy">
        <p className="eyebrow">EN TU IPHONE</p>
        <h2 id="install-guide-title">Instala LevelUp</h2>
        <p>Úsala desde tu pantalla de inicio, sin la barra del navegador.</p>
        <ol>
          <li><span>1</span><div><strong>Toca Compartir</strong><small>Busca el cuadrado con una flecha hacia arriba.</small></div></li>
          <li><span>2</span><div><strong>Elige “Agregar a pantalla de inicio”</strong><small>Puede aparecer más abajo en la lista de acciones.</small></div></li>
          <li><span>3</span><div><strong>Activa “Abrir como app web”</strong><small>Después, toca Agregar.</small></div></li>
        </ol>
        <p className="install-guide-note"><Icon name="info" size={14} />Si ya registraste progreso en Safari, expórtalo antes y luego impórtalo desde la app instalada.</p>
      </div>
    </section>
  );
}
