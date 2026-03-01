import React, { createContext, useContext } from "react";

const PageReadyContext = createContext({
  markReady: () => {},
});

export function PageReadyProvider({ value, children }) {
  return (
    <PageReadyContext.Provider value={value}>
      {children}
    </PageReadyContext.Provider>
  );
}

export function usePageReady() {
  return useContext(PageReadyContext);
}