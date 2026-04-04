import { apiClient, setTokens, clearTokens } from '../client';
import { API } from '../endpoints';
import { LoginResponse, TokenRefreshResponse, User } from '../types';

export const authService = {
  async login(matricule: string, password?: string): Promise<LoginResponse> {
    const { data } = await apiClient.post(API.AUTH.LOGIN, { matricule, password });
    if (data.access && data.refresh) {
      setTokens(data.access, data.refresh);
    }
    return data;
  },

  async firebaseLogin(idToken: string): Promise<LoginResponse> {
    const { data } = await apiClient.post(API.AUTH.FIREBASE_LOGIN, { id_token: idToken });
    if (data.access && data.refresh) {
      setTokens(data.access, data.refresh);
    }
    return data;
  },

  async logout(refreshToken: string): Promise<void> {
    try {
      await apiClient.post(API.AUTH.LOGOUT, { refresh: refreshToken });
    } finally {
      clearTokens();
    }
  },

  async refreshToken(refresh: string): Promise<TokenRefreshResponse> {
    const { data } = await apiClient.post(API.AUTH.REFRESH, { refresh });
    if (data.access) {
      const currentRefresh = localStorage.getItem('eduignite_refresh_token');
      setTokens(data.access, currentRefresh || refresh);
    }
    return data;
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get(API.AUTH.ME);
    return data;
  },

  async activateAccount(
    matricule: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<LoginResponse> {
    const { data } = await apiClient.post(API.AUTH.ACTIVATE, {
      matricule,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    if (data.access && data.refresh) {
      setTokens(data.access, data.refresh);
    }
    return data;
  },

  async changePassword(
    oldPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ detail: string }> {
    const { data } = await apiClient.post(API.AUTH.CHANGE_PASSWORD, {
      old_password: oldPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
    return data;
  },

  async requestPasswordReset(email: string): Promise<{ detail: string }> {
    const { data } = await apiClient.post(API.AUTH.PASSWORD_RESET, { email });
    return data;
  },

  async confirmPasswordReset(token: string, newPassword: string): Promise<{ detail: string }> {
    const { data } = await apiClient.post(API.AUTH.PASSWORD_RESET_CONFIRM, {
      token,
      new_password: newPassword,
    });
    return data;
  },
};
