import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { getFeatures } from '../api/features';
import type { Features } from '../api/features';

const FeaturesContext = createContext<Features>({ sow_import: false });

export function FeaturesProvider({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<Features>({ sow_import: false });

  useEffect(() => {
    getFeatures().then((data) => { if (data) setFeatures(data); });
  }, []);

  return <FeaturesContext.Provider value={features}>{children}</FeaturesContext.Provider>;
}

export function useFeatures() {
  return useContext(FeaturesContext);
}
