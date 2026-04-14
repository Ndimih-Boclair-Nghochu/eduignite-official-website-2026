import { apiClient, clearTokens, setTokens } from "../client";
import { API } from "../endpoints";
import type {
  ActivateAccountRequest,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  LogoutRequest,
  TokenRefreshResponse,
  User,
} from "../types";

function normalizeUser(user: Record<string, any> | undefined): User {
  const school = user?.school
    ? {
        ...user.school,
        shortName: user.school.shortName ?? user.school.short_name,
        subDivision: user.school.subDivision ?? user.school.sub_division,
        cityVillage: user.school.cityVillage ?? user.school.city_village,
        postalCode: user.school.postalCode ?? user.school.postal_code,
      }
    : undefined;

  return {
    ...(user ?? {}),
    id: user?.id ?? "",
    name: user?.name ?? "",
    email: user?.email ?? "",
    role: user?.role ?? "STUDENT",
    school,
    schoolId: user?.schoolId ?? user?.school_id ?? user?.school?.id ?? null,
    isLicensePaid: user?.isLicensePaid ?? user?.is_license_paid ?? false,
    aiRequestCount: user?.aiRequestCount ?? user?.ai_request_count ?? 0,
    annualAvg: user?.annualAvg ?? user?.annual_avg,
    isPlatformExecutive: user?.isPlatformExecutive ?? user?.is_platform_executive,
    isSchoolAdmin: user?.isSchoolAdmin ?? user?.is_school_admin,
  };
}

function normalizeLoginResponse(data: Record<string, any>): LoginResponse {
  const access = data.access ?? data.access_token ?? "";
  const refresh = data.refresh ?? data.refresh_token ?? "";

  return {
    ...data,
    access,
    refresh,
    access_token: access,
    refresh_token: refresh,
    user: normalizeUser(data.user),
  };
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("eduignite_refresh_token") || localStorage.getItem("refresh_token");
}

export const authService = {
  async login(credentials: string | LoginRequest, password?: string): Promise<LoginResponse> {
    const payload =
      typeof credentials === "string"
        ? { matricule: credentials, password }
        : credentials;

    const { data } = await apiClient.post(API.AUTH.LOGIN, payload);
    const normalized = normalizeLoginResponse(data);

    if (normalized.access && normalized.refresh) {
      setTokens(normalized.access, normalized.refresh);
    }

    return normalized;
  },

  async firebaseLogin(idToken: string): Promise<LoginResponse> {
    const { data } = await apiClient.post(API.AUTH.FIREBASE_LOGIN, { id_token: idToken });
    const normalized = normalizeLoginResponse(data);

    if (normalized.access && normalized.refresh) {
      setTokens(normalized.access, normalized.refresh);
    }

    return normalized;
  },

  async logout(payload?: string | LogoutRequest): Promise<void> {
    const refreshToken =
      typeof payload === "string"
        ? payload
        : payload?.refreshToken ?? payload?.refresh ?? getStoredRefreshToken();

    try {
      if (refreshToken) {
        await apiClient.post(API.AUTH.LOGOUT, { refresh: refreshToken });
      }
    } finally {
      clearTokens();
    }
  },

  async refreshToken(refresh?: string): Promise<TokenRefreshResponse> {
    const refreshToken = refresh ?? getStoredRefreshToken();
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const { data } = await apiClient.post(API.AUTH.REFRESH, { refresh: refreshToken });
    const access = data.access ?? data.access_token ?? "";

    if (access) {
      setTokens(access, refreshToken);
    }

    return { ...data, access, access_token: access };
  },

  async getMe(): Promise<User> {
    const { data } = await apiClient.get(API.AUTH.ME);
    return normalizeUser(data);
  },

  async getCurrentUser(): Promise<User> {
    return this.getMe();
  },

  async activateAccount(
    payloadOrMatricule: ActivateAccountRequest | string,
    newPassword?: string,
    confirmPassword?: string
  ): Promise<LoginResponse> {
    const payload =
      typeof payloadOrMatricule === "string"
        ? {
            matricule: payloadOrMatricule,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }
        : {
            matricule: payloadOrMatricule.matricule,
            new_password: payloadOrMatricule.new_password ?? payloadOrMatricule.newPassword,
            confirm_password:
              payloadOrMatricule.confirm_password ?? payloadOrMatricule.confirmPassword,
          };

    const { data } = await apiClient.post(API.AUTH.ACTIVATE, payload);
    return normalizeLoginResponse(data);
  },

  async changePassword(
    payloadOrOldPassword: ChangePasswordRequest | string,
    newPassword?: string,
    confirmPassword?: string
  ): Promise<{ detail: string }> {
    const payload =
      typeof payloadOrOldPassword === "string"
        ? {
            old_password: payloadOrOldPassword,
            new_password: newPassword,
            confirm_password: confirmPassword,
          }
        : {
            old_password: payloadOrOldPassword.old_password ?? payloadOrOldPassword.oldPassword,
            new_password: payloadOrOldPassword.new_password ?? payloadOrOldPassword.newPassword,
            confirm_password:
              payloadOrOldPassword.confirm_password ?? payloadOrOldPassword.confirmPassword,
          };

    const { data } = await apiClient.post(API.AUTH.CHANGE_PASSWORD, payload);
    return data;
  },

  async requestPasswordReset(matricule: string): Promise<{ detail: string }> {
    const { data } = await apiClient.post(API.AUTH.PASSWORD_RESET, { matricule });
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
