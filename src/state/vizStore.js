import { useSyncExternalStore } from "react";

const store = {
  disease: null,
  diseaseLocked: false,
};

const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

export function setDiseaseFromStreamgraph(disease) {
  store.disease = disease;
  store.diseaseLocked = true;
  emit();
}

export function setDiseaseManual(disease) {
  store.disease = disease;
  emit();
}

export function unlockDiseaseSelector() {
  store.diseaseLocked = false;
  emit();
}

export function useVizStore() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => store,
    () => store
  );
}