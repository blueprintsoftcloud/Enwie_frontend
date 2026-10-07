import React, { createContext, useContext, useState, ReactNode } from "react";

interface AuthModalContextValue {
  isOpen: boolean;
  isLogin: boolean;
  openAuthModal: (loginMode?: boolean) => void;
  closeAuthModal: () => void;
  setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthModalContext = createContext<AuthModalContextValue | undefined>(undefined);

export const AuthModalProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const openAuthModal = (loginMode = true) => {
    setIsLogin(loginMode);
    setIsOpen(true);
  };

  const closeAuthModal = () => setIsOpen(false);

  return (
    <AuthModalContext.Provider
      value={{ isOpen, isLogin, openAuthModal, closeAuthModal, setIsLogin }}
    >
      {children}
    </AuthModalContext.Provider>
  );
};

export const useAuthModal = (): AuthModalContextValue => {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error("useAuthModal must be used inside <AuthModalProvider>");
  return ctx;
};
