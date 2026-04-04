import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';
import { usersService } from '@/lib/api/services/users.service';
import type {
  User,
  CreateUserRequest,
  UpdateProfileRequest,
  UpdateRoleRequest,
  ToggleLicenseRequest,
  PaginationParams,
} from '@/lib/api/types';

// Query Key Factory
const usersKeys = {
  all: ['users'] as const,
  lists: () => [...usersKeys.all, 'list'] as const,
  list: (params?: PaginationParams) =>
    [...usersKeys.lists(), { ...params }] as const,
  details: () => [...usersKeys.all, 'detail'] as const,
  detail: (id: string) => [...usersKeys.details(), id] as const,
  stats: () => [...usersKeys.all, 'stats'] as const,
  executives: () => [...usersKeys.all, 'executives'] as const,
  bySchool: (schoolId: string) =>
    [...usersKeys.all, 'school', schoolId] as const,
};

/**
 * Hook for fetching paginated users
 */
export function useUsers(params?: PaginationParams) {
  return useQuery({
    queryKey: usersKeys.list(params),
    queryFn: () => usersService.getUsers(params),
  });
}

/**
 * Hook for fetching single user by ID
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: usersKeys.detail(id),
    queryFn: () => usersService.getUser(id),
    enabled: !!id,
  });
}

/**
 * Hook for fetching user statistics
 */
export function useUserStats() {
  return useQuery({
    queryKey: usersKeys.stats(),
    queryFn: () => usersService.getUserStats(),
  });
}

/**
 * Hook for fetching executives only
 */
export function useExecutives() {
  return useQuery({
    queryKey: usersKeys.executives(),
    queryFn: () => usersService.getExecutives(),
  });
}

/**
 * Hook for fetching users by school
 */
export function useUsersBySchool(schoolId: string) {
  return useQuery({
    queryKey: usersKeys.bySchool(schoolId),
    queryFn: () => usersService.getUsersBySchool(schoolId),
    enabled: !!schoolId,
  });
}

/**
 * Hook for creating a new user
 */
export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserRequest) => usersService.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

/**
 * Hook for updating user profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProfileRequest }) =>
      usersService.updateProfile(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({
        queryKey: usersKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

/**
 * Hook for updating user role
 */
export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleRequest }) =>
      usersService.updateRole(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: usersKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}

/**
 * Hook for toggling user license
 */
export function useToggleLicense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ToggleLicenseRequest }) =>
      usersService.toggleLicense(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: usersKeys.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: usersKeys.lists() });
    },
  });
}
