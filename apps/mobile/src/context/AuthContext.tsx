import React from 'react';
import { AuthProvider as BaseAuthProvider, useAuth } from '@nakshra/shared-auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BaseAuthProvider>{children}</BaseAuthProvider>;
};

export { useAuth };
