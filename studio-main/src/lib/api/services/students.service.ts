import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  Student,
  PaginatedResponse,
  ListParams,
  CreateStudentRequest,
} from '../types';

export const studentsService = {
  async getStudents(params?: ListParams): Promise<PaginatedResponse<Student>> {
    const { data } = await apiClient.get(API.STUDENTS.BASE, { params });
    return data;
  },

  async getStudent(id: string): Promise<Student> {
    const { data } = await apiClient.get(API.STUDENTS.DETAIL(id));
    return data;
  },

  async createStudent(studentData: CreateStudentRequest): Promise<Student> {
    const { data } = await apiClient.post(API.STUDENTS.BASE, studentData);
    return data;
  },

  async updateStudent(id: string, studentData: Partial<CreateStudentRequest>): Promise<Student> {
    const { data } = await apiClient.patch(API.STUDENTS.DETAIL(id), studentData);
    return data;
  },

  async getHonourRoll(params?: ListParams): Promise<PaginatedResponse<Student>> {
    const { data } = await apiClient.get(API.STUDENTS.HONOUR_ROLL, { params });
    return data;
  },

  async getMyChildren(params?: ListParams): Promise<PaginatedResponse<Student>> {
    const { data } = await apiClient.get(API.STUDENTS.MY_CHILDREN, { params });
    return data;
  },

  async getClassList(className: string): Promise<Student[]> {
    const { data } = await apiClient.get(API.STUDENTS.CLASS_LIST(className));
    return data;
  },

  async linkParent(
    studentId: string,
    parentId: string,
    relationship: string
  ): Promise<{ detail: string }> {
    const { data } = await apiClient.post(API.STUDENTS.LINK_PARENT(studentId), {
      parent_id: parentId,
      relationship,
    });
    return data;
  },

  async getStudentCard(id: string): Promise<any> {
    const { data } = await apiClient.get(API.STUDENTS.STUDENT_CARD(id));
    return data;
  },
};
