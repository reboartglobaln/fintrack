import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import api from '../api/axios';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  loginWithGooglePopup: () => Promise<{
    success: boolean;
    isNew?: boolean;
    message?: string;
    notConfigured?: boolean;
    configData?: {
      callbackDevUrl?: string;
      callbackSharedUrl?: string;
      redirectUri?: string;
    };
  }>;
  loginWithGoogleMock: (
    email?: string,
    name?: string
  ) => Promise<{ success: boolean; isNew?: boolean; message?: string }>;
  loginWithGoogleCredential: (
    credential: string
  ) => Promise<{ success: boolean; isNew?: boolean; message?: string }>;
  logout: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setSession: (token: string, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('fintrack_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('fintrack_token');
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const setSession = (receivedToken: string, receivedUser: User) => {
    localStorage.setItem('fintrack_token', receivedToken);
    localStorage.setItem('fintrack_user', JSON.stringify(receivedUser));
    setToken(receivedToken);
    setUser(receivedUser);
  };

  // Sync token from localStorage or listen to logout and OAuth message events
  useEffect(() => {
    const handleAuthLogout = () => {
      setUser(null);
      setToken(null);
    };

    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        const { token: receivedToken, user: receivedUser } = event.data;
        if (receivedToken && receivedUser) {
          setSession(receivedToken, receivedUser);
        }
      }
    };

    window.addEventListener('fintrack_auth_logout', handleAuthLogout);
    window.addEventListener('message', handleOAuthMessage);

    return () => {
      window.removeEventListener('fintrack_auth_logout', handleAuthLogout);
      window.removeEventListener('message', handleOAuthMessage);
    };
  }, []);

  // Validate session on app launch
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('fintrack_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await api.get('/auth/me');
        if (res.data?.user) {
          setUser(res.data.user);
          localStorage.setItem('fintrack_user', JSON.stringify(res.data.user));
        }
      } catch (err) {
        // Token invalid or expired
        localStorage.removeItem('fintrack_token');
        localStorage.removeItem('fintrack_user');
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success && res.data?.token) {
        const receivedToken = res.data.token;
        const receivedUser = res.data.user;

        localStorage.setItem('fintrack_token', receivedToken);
        localStorage.setItem('fintrack_user', JSON.stringify(receivedUser));

        setToken(receivedToken);
        setUser(receivedUser);

        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data?.message || 'Login gagal.' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat login.';
      return { success: false, message: msg };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const res = await api.post('/auth/register', { name, email, password });
      if (res.data?.success && res.data?.token) {
        const receivedToken = res.data.token;
        const receivedUser = res.data.user;

        localStorage.setItem('fintrack_token', receivedToken);
        localStorage.setItem('fintrack_user', JSON.stringify(receivedUser));

        setToken(receivedToken);
        setUser(receivedUser);

        return { success: true, message: res.data.message };
      }
      return { success: false, message: res.data?.message || 'Registrasi gagal.' };
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Terjadi kesalahan saat registrasi.';
      return { success: false, message: msg };
    }
  };

  const loginWithGooglePopup = async (): Promise<{
    success: boolean;
    isNew?: boolean;
    message?: string;
    notConfigured?: boolean;
    configData?: {
      callbackDevUrl?: string;
      callbackSharedUrl?: string;
      redirectUri?: string;
    };
  }> => {
    try {
      const origin = window.location.origin;
      const res = await api.get('/auth/google/url', { params: { origin } });

      if (!res.data?.configured || !res.data?.url) {
        return {
          success: false,
          notConfigured: true,
          configData: {
            callbackDevUrl: res.data?.callbackDevUrl,
            callbackSharedUrl: res.data?.callbackSharedUrl,
            redirectUri: res.data?.redirectUri,
          },
        };
      }

      const authUrl = res.data.url;
      const width = 520;
      const height = 640;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authUrl,
        'google_oauth_popup',
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,status=1`
      );

      if (!popup) {
        return {
          success: false,
          message: 'Pop-up diblokir oleh browser. Harap izinkan pop-up untuk melanjutkan masuk dengan Google.',
        };
      }

      // Return a promise that resolves on postMessage or popup close
      return new Promise((resolve) => {
        let isResolved = false;

        const handleMessage = (e: MessageEvent) => {
          if (e.data?.type === 'GOOGLE_AUTH_SUCCESS') {
            isResolved = true;
            window.removeEventListener('message', handleMessage);
            clearInterval(timer);
            setSession(e.data.token, e.data.user);
            resolve({
              success: true,
              isNew: e.data.isNew,
              message: e.data.isNew ? 'Registrasi dengan akun Google berhasil!' : 'Berhasil masuk dengan akun Google!',
            });
          } else if (e.data?.type === 'GOOGLE_AUTH_ERROR') {
            isResolved = true;
            window.removeEventListener('message', handleMessage);
            clearInterval(timer);
            resolve({
              success: false,
              message: e.data.message || 'Gagal masuk dengan akun Google.',
            });
          }
        };

        window.addEventListener('message', handleMessage);

        const timer = setInterval(() => {
          if (popup.closed) {
            clearInterval(timer);
            window.removeEventListener('message', handleMessage);
            if (!isResolved) {
              resolve({
                success: false,
                message: 'Jendela login Google ditutup sebelum selesai.',
              });
            }
          }
        }, 600);
      });
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.message || 'Terjadi kesalahan saat memanggil layanan Google.',
      };
    }
  };

  const loginWithGoogleMock = async (
    email?: string,
    name?: string
  ): Promise<{ success: boolean; isNew?: boolean; message?: string }> => {
    try {
      const res = await api.post('/auth/google/mock-login', { email, name });
      if (res.data?.success && res.data?.token) {
        setSession(res.data.token, res.data.user);
        return {
          success: true,
          isNew: res.data.isNew,
          message: res.data.message,
        };
      }
      return { success: false, message: res.data?.message || 'Login gagal.' };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Gagal login akun Google demo.',
      };
    }
  };

  const loginWithGoogleCredential = async (
    credential: string
  ): Promise<{ success: boolean; isNew?: boolean; message?: string }> => {
    try {
      const res = await api.post('/auth/google/credential', { credential });
      if (res.data?.success && res.data?.token) {
        setSession(res.data.token, res.data.user);
        return {
          success: true,
          isNew: res.data.isNew,
          message: res.data.message,
        };
      }
      return { success: false, message: res.data?.message || 'Verifikasi Google credential gagal.' };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.message || 'Gagal memverifikasi token Google.',
      };
    }
  };

  const logout = () => {
    try {
      api.post('/auth/logout').catch(() => {});
    } finally {
      localStorage.removeItem('fintrack_token');
      localStorage.removeItem('fintrack_user');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        loginWithGooglePopup,
        loginWithGoogleMock,
        loginWithGoogleCredential,
        logout,
        setUser,
        setSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
