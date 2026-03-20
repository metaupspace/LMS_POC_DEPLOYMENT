import { baseApi } from './baseApi';
import type {
  CourseStatus,
  ApiResponse,
  PaginatedResponse,
  PaginationMeta,
} from '@/types';

// ─── Types ──────────────────────────────────────────────

export interface PopulatedStaff {
  _id: string;
  name: string;
  empId: string;
  email?: string;
}

export interface PopulatedCoach {
  _id: string;
  name: string;
  empId: string;
  email?: string;
}

export interface CourseData {
  _id: string;
  title: string;
  description: string;
  domain: string;
  thumbnail: string;
  status: CourseStatus;
  coach: string | PopulatedCoach | null;
  assignedStaff: (string | PopulatedStaff)[];
  modules: string[];
  proofOfWorkEnabled: boolean;
  proofOfWorkInstructions: string;
  proofOfWorkMandatory: boolean;
  downloadAllowed: boolean;
  passingThreshold: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestionData {
  questionText: string;
  questionImage?: string;
  options: { text: string; image?: string; isCorrect: boolean }[];
  points: number;
}

export interface QuizData {
  _id: string;
  questions: QuizQuestionData[];
  passingScore: number;
  maxAttempts: number;
}

export interface ModuleData {
  _id: string;
  title: string;
  description: string;
  course: string;
  order: number;
  contents: {
    type: string;
    title: string;
    data: string;
    duration: number;
    downloadable: boolean;
  }[];
  quiz: QuizData | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetCoursesParams {
  page?: number;
  limit?: number;
  search?: string;
  domain?: string;
  status?: CourseStatus;
  coach?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateCourseBody {
  title: string;
  description: string;
  domain: string;
  thumbnail?: string;
  coach?: string;
  proofOfWorkEnabled?: boolean;
  proofOfWorkInstructions?: string;
  proofOfWorkMandatory?: boolean;
  downloadAllowed?: boolean;
  passingThreshold?: number;
  status?: 'draft' | 'active';
}

export interface UpdateCourseBody {
  title?: string;
  description?: string;
  domain?: string;
  thumbnail?: string;
  status?: CourseStatus;
  coach?: string;
  proofOfWorkEnabled?: boolean;
  proofOfWorkInstructions?: string;
  proofOfWorkMandatory?: boolean;
  downloadAllowed?: boolean;
  passingThreshold?: number;
}

export interface AssignCourseBody {
  staffIds: string[];
}

export interface ModuleProgressData {
  moduleId: string;
  moduleTitle: string;
  moduleOrder: number;
  status: string;
  videoCompleted: boolean;
  videoPoints: number;
  quizPassed: boolean;
  quizPoints: number;
  proofOfWorkPoints: number;
  totalModulePoints: number;
  completedAt: string | null;
}

export interface LearnerStatData {
  user: {
    _id: string;
    name: string;
    empId: string;
    email?: string;
    domain?: string;
    location?: string;
  };
  courseStatus: string;
  modulesCompleted: number;
  modulesInProgress: number;
  modulesNotStarted: number;
  totalModules: number;
  completionPercent: number;
  pointsEarned: number;
  totalPoints: number;
  badges: { name: string; icon: string; earnedAt: string }[];
  streak: number;
  moduleProgress: ModuleProgressData[];
}

export interface ModuleStatData {
  moduleId: string;
  title: string;
  order: number;
  totalLearners: number;
  completed: number;
  inProgress: number;
  notStarted: number;
  completionRate: number;
  avgPoints: number;
}

export interface CourseAnalyticsData {
  courseId: string;
  courseSummary: {
    totalLearners: number;
    learnersCompleted: number;
    learnersInProgress: number;
    learnersNotStarted: number;
    courseCompletionRate: number;
    totalModules: number;
    totalPointsEarned: number;
    avgPointsPerLearner: number;
  };
  perModuleStats: ModuleStatData[];
  perLearnerStats: LearnerStatData[];
}

// ─── API Slice ──────────────────────────────────────────

export const courseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCourses: builder.query<PaginatedResponse<CourseData> & { pagination: PaginationMeta }, GetCoursesParams>({
      query: (params) => ({
        url: '/courses',
        params,
      }),
      providesTags: (result) =>
        result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: 'Course' as const, id: _id })),
              { type: 'Course', id: 'LIST' },
            ]
          : [{ type: 'Course', id: 'LIST' }],
    }),

    getCourseById: builder.query<ApiResponse<CourseData>, string>({
      query: (id) => `/courses/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Course', id }],
    }),

    createCourse: builder.mutation<ApiResponse<CourseData>, CreateCourseBody>({
      query: (body) => ({
        url: '/courses',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Course', id: 'LIST' }],
    }),

    updateCourse: builder.mutation<ApiResponse<CourseData>, { id: string; body: UpdateCourseBody }>({
      query: ({ id, body }) => ({
        url: `/courses/${id}`,
        method: 'PATCH',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Course', id },
        { type: 'Course', id: 'LIST' },
      ],
    }),

    deleteCourse: builder.mutation<ApiResponse<null>, string>({
      query: (id) => ({
        url: `/courses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Course', id },
        { type: 'Course', id: 'LIST' },
      ],
    }),

    assignCourse: builder.mutation<ApiResponse<CourseData>, { id: string; body: AssignCourseBody }>({
      query: ({ id, body }) => ({
        url: `/courses/${id}/assign`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Course', id },
        { type: 'Course', id: 'LIST' },
      ],
    }),

    getCourseModules: builder.query<ApiResponse<ModuleData[]>, string>({
      query: (courseId) => `/courses/${courseId}/modules`,
      providesTags: (_result, _error, courseId) => [
        { type: 'Module', id: `COURSE_${courseId}` },
      ],
    }),

    getCourseAnalytics: builder.query<ApiResponse<CourseAnalyticsData>, string>({
      query: (courseId) => `/courses/${courseId}/analytics`,
      providesTags: (_result, _error, courseId) => [
        { type: 'Progress', id: `COURSE_${courseId}` },
      ],
    }),
  }),
});

export const {
  useGetCoursesQuery,
  useGetCourseByIdQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useAssignCourseMutation,
  useGetCourseModulesQuery,
  useGetCourseAnalyticsQuery,
} = courseApi;
