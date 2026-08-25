import { Suspense } from 'react';
import LevelUpApp from './home/LevelUpApp';

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LevelUpApp />
    </Suspense>
  );
}
