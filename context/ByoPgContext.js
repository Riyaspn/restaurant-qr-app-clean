import React, { createContext, useContext } from 'react';

const ByoPgContext = createContext();

export function ByoPgProvider({ children }) {
  // could provide default currency, metadata builder, etc.
  return <ByoPgContext.Provider value={{}}>{children}</ByoPgContext.Provider>;
}

export function useByoPg() {
  return useContext(ByoPgContext);
}
