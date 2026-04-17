import { apiClient } from '../client';
import { API } from '../endpoints';
import {
  Student,
  PaginatedResponse,
  ListParams,
  CreateStudentRequest,
  BulkStudentUploadRequest,
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

  async bulkUploadStudents(payload: BulkStudentUploadRequest): Promise<any> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('student_class', payload.student_class);
    formData.append('class_level', payload.class_level);
    formData.append('section', payload.section);
    if (payload.admission_date) formData.append('admission_date', payload.admission_date);
    if (payload.guardian_name) formData.append('guardian_name', payload.guardian_name);
    if (payload.guardian_phone) formData.append('guardian_phone', payload.guardian_phone);
    if (payload.guardian_whatsapp) formData.append('guardian_whatsapp', payload.guardian_whatsapp);
    const { data } = await apiClient.post(API.STUDENTS.BULK_UPLOAD, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
    parentIdOrPayload: string | { parentId: string; relationship: string },
    relationship?: string
  ): Promise<{ detail: string }> {
    const payload =
      typeof parentIdOrPayload === 'string'
        ? { parent_id: parentIdOrPayload, relationship }
        : { parent_id: parentIdOrPayload.parentId, relationship: parentIdOrPayload.relationship };
    const { data } = await apiClient.post(API.STUDENTS.LINK_PARENT(studentId), {
      ...payload,
    });
    return data;
  },

  async getStudentCard(id: string): Promise<any> {
    const { data } = await apiClient.get(API.STUDENTS.STUDENT_CARD(id));
    return data;
  },

  async downloadAdmissionForm(id: string): Promise<Blob> {
    const { data } = await apiClient.get(API.STUDENTS.ADMISSION_FORM(id), {
      responseType: 'blob',
    });
    return data;
  },
};
