import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const { showToast } = useToast();

  const refreshProfile = useCallback(async () => {
    const token = localStorage.getItem('dapitan_token');
    if (!token) {
      setCurrentUser(null);
      setLoadingAuth(false);
      return null;
    }

    try {
      const res = await api.get('/auth/profile');
      if (res.data?.success) {
        setCurrentUser(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.warn('Session expired or invalid token:', err);
      localStorage.removeItem('dapitan_token');
      setCurrentUser(null);
    } finally {
      setLoadingAuth(false);
    }
    return null;
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email, password) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      if (res.data?.success && res.data.data?.token) {
        localStorage.setItem('dapitan_token', res.data.data.token);
        setCurrentUser(res.data.data.user);
        showToast(`Welcome back, ${res.data.data.user.full_name}!`, 'success');
        return { success: true, user: res.data.data.user };
      }
      return { success: false, message: res.data?.message || 'Login failed.' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Login failed. Please check your credentials.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const register = async (formData) => {
    try {
      const res = await api.post('/auth/register', formData);
      if (res.data?.success && res.data.data?.token) {
        localStorage.setItem('dapitan_token', res.data.data.token);
        setCurrentUser(res.data.data.user);
        showToast(`Account created successfully! Welcome, ${res.data.data.user.full_name}.`, 'success');
        return { success: true, user: res.data.data.user };
      }
      return { success: false, message: res.data?.message || 'Registration failed.' };
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const logout = () => {
    localStorage.removeItem('dapitan_token');
    setCurrentUser(null);
    showToast('You have been logged out.', 'info');
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await api.put('/auth/profile', profileData);
      if (res.data?.success) {
        setCurrentUser(res.data.data);
        showToast('Profile updated successfully!', 'success');
        return { success: true, user: res.data.data };
      }
      return { success: false, message: res.data?.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to update profile.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  const changePassword = async (passwordData) => {
    try {
      const res = await api.put('/auth/change-password', passwordData);
      if (res.data?.success) {
        showToast('Password changed successfully!', 'success');
        return { success: true };
      }
      return { success: false, message: res.data?.message };
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to change password.';
      showToast(msg, 'error');
      return { success: false, message: msg };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loadingAuth,
        login,
        register,
        logout,
        refreshProfile,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
