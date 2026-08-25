'use client';

import { useRef, type Dispatch, type SetStateAction } from 'react';
import {
  createSeedState,
  saveState,
  syncAchievements,
  type AppState
} from '../lib/levelup';
import { PERSONAL_MODE } from '../lib/feature-flags';

type DataTransferOptions = {
  state: AppState;
  today: string;
  setState: Dispatch<SetStateAction<AppState>>;
  setNotice: (message: string) => void;
};

export function useDataTransfer({
  state,
  today,
  setState,
  setNotice
}: DataTransferOptions) {
  const importRef = useRef<HTMLInputElement>(null);

  const exportData = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `levelup-${today}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice('Tus datos se exportaron');
  };

  const importData = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Partial<AppState>;
        if (
          !parsed.settings ||
          !Array.isArray(parsed.meals) ||
          !Array.isArray(parsed.exercises)
        )
          throw new Error('invalid');
        const seed = createSeedState({ personalMode: PERSONAL_MODE });
        const imported = {
          ...seed,
          ...parsed,
          settings: {
            ...seed.settings,
            ...parsed.settings,
            questXp: {
              ...seed.settings.questXp,
              ...(parsed.settings.questXp ?? {})
            }
          }
        } as AppState;
        setState(syncAchievements(imported, today));
        setNotice('Datos importados correctamente');
      } catch {
        setNotice('No pudimos leer ese archivo JSON');
      }
    };
    reader.readAsText(file);
    if (importRef.current) importRef.current.value = '';
  };

  const resetData = () => {
    if (
      !window.confirm(
        '¿Borrar todo el progreso local de LevelUp? Esta acción no se puede deshacer.'
      )
    )
      return;
    const fresh = createSeedState({ personalMode: PERSONAL_MODE });
    setState(fresh);
    saveState(fresh);
    setNotice('Datos restablecidos');
  };

  return {
    importRef,
    importData,
    exportData,
    resetData,
    triggerImport: () => importRef.current?.click()
  };
}
