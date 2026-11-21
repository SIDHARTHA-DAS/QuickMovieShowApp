import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const DEFAULT_USER = {
  userId: 'mobile_demo_user_01',
  name: 'Sidharth Das',
  email: 'sidharth.demo@quickshow.app',
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_USER);

  const loginUser = ({ name, email, userId }) => {
    const cleanEmail = (email || '').trim();
    const cleanName = (name || '').trim() || 'QuickShow User';
    const derivedId =
      (userId || '').trim() ||
      (cleanEmail
        ? `user_${cleanEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : `user_${Date.now()}`);

    setUser({
      userId: derivedId,
      name: cleanName,
      email: cleanEmail || 'user@quickshow.app',
    });
  };

  const logoutUser = () => {
    setUser(null);
  };

  const useDemoUser = () => {
    setUser(DEFAULT_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.userId || DEFAULT_USER.userId,
        isAuthenticated: Boolean(user),
        loginUser,
        logoutUser,
        useDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}