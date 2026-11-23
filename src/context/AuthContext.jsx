import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export const USER_ICON_OPTIONS = [
  'person',
  'sparkles',
  'film',
  'rocket',
  'star',
  'flame',
];

// for now we use hard code static demo user
const DEFAULT_USER = {
  userId: 'mobile_demo_user_01',
  name: 'Sidharth Das',
  email: 'sidharth.demo@quickshow.app',
  avatarIcon: 'person',
};


// function for handel authentication
export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEFAULT_USER);

  const loginUser = ({ name, email, userId, avatarIcon }) => {
    const cleanEmail = (email || '').trim();
    const cleanName = (name || '').trim() || 'QuickShow User';
    const derivedId =
      (userId || '').trim() ||
      (cleanEmail
        ? `user_${cleanEmail.toLowerCase().replace(/[^a-z0-9]/g, '_')}`
        : `user_${Date.now()}`);

    setUser((prev) => ({
      userId: derivedId,
      name: cleanName,
      email: cleanEmail || 'user@quickshow.app',
      avatarIcon:
        avatarIcon || prev?.avatarIcon || DEFAULT_USER.avatarIcon,
    }));
  };


  // function for update profile data.
  const updateProfile = ({ name, email, avatarIcon }) => {
    setUser((prev) => {
      const base = prev || DEFAULT_USER;
      const nextName =
        typeof name === 'string' ? name.trim() || base.name : base.name;
      const nextEmail =
        typeof email === 'string' ? email.trim() || base.email : base.email;
      const nextIcon = avatarIcon || base.avatarIcon || DEFAULT_USER.avatarIcon;

      return {
        ...base,
        name: nextName,
        email: nextEmail,
        avatarIcon: nextIcon,
      };
    });
  };

  // function for logout user.
  const logoutUser = () => {
    setUser(null);
  };

  const useDemoUser = () => {
    setUser(DEFAULT_USER);
  };

  const activeIcon = user?.avatarIcon || DEFAULT_USER.avatarIcon;

  return (
    <AuthContext.Provider
      value={{
        user,
        userId: user?.userId || DEFAULT_USER.userId,
        avatarIcon: activeIcon,
        isAuthenticated: Boolean(user),
        loginUser,
        updateProfile,
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