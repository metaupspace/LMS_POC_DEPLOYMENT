const spec = {
  openapi: '3.0.3',
  info: {
    title: 'LMS Platform API',
    version: '1.0.0',
    description:
      'Production-ready Learning Management System API with 4 roles: Admin, Manager, Coach, Staff. Features course management, training sessions, gamification, and real-time notifications.',
  },
  servers: [{ url: '/api', description: 'LMS API' }],
  security: [{ BearerAuth: [] }],
  tags: [
    { name: 'Authentication', description: 'Login, logout, token refresh, password management' },
    { name: 'Users', description: 'User CRUD, off-boarding, on-boarding' },
    { name: 'Courses', description: 'Course management and assignment' },
    { name: 'Modules', description: 'Course module management' },
    { name: 'Quizzes', description: 'Quiz creation and attempts' },
    { name: 'Training Sessions', description: 'Session scheduling, attendance, and codes' },
    { name: 'Learner Progress', description: 'Content progress tracking' },
    { name: 'Proof of Work', description: 'Proof submission and review' },
    { name: 'Gamification', description: 'Points, badges, streaks' },
    { name: 'Notifications', description: 'Notification management and SSE stream' },
    { name: 'Upload', description: 'File upload to Cloudinary' },
    { name: 'Reports', description: 'PDF and Excel report generation' },
    { name: 'Dashboard', description: 'Dashboard statistics' },
    { name: 'Tests', description: 'Certification test management, attempts, and proctoring' },
    { name: 'Certifications', description: 'User certification records' },
    { name: 'Admin', description: 'Admin utilities — activity feed, cron health, repair tools' },
    { name: 'Utilities', description: 'Health check, PDF proxy, seed scripts' },
  ],
  components: {
    securitySchemes: {
      BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer' },
          limit: { type: 'integer' },
          total: { type: 'integer' },
          totalPages: { type: 'integer' },
          hasNext: { type: 'boolean' },
          hasPrev: { type: 'boolean' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          data: {},
          message: { type: 'string' },
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: { type: 'string' },
          message: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          empId: { type: 'string', example: 'EMP-0001' },
          name: { type: 'string' },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          role: { type: 'string', enum: ['admin', 'manager', 'coach', 'staff'] },
          domain: { type: 'string' },
          location: { type: 'string' },
          status: { type: 'string', enum: ['active', 'offboarded'] },
          profileImage: { type: 'string' },
          preferredLanguage: { type: 'string' },
          firstLogin: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
      },
      Course: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          domain: { type: 'string' },
          thumbnail: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'active', 'archived'] },
          coach: { type: 'string' },
          assignedStaff: { type: 'array', items: { type: 'string' } },
          modules: { type: 'array', items: { type: 'string' } },
          proofOfWorkEnabled: { type: 'boolean' },
          proofOfWorkInstructions: { type: 'string' },
          proofOfWorkMandatory: { type: 'boolean' },
          passingThreshold: { type: 'number' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Module: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          course: { type: 'string' },
          order: { type: 'integer' },
          contents: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['video', 'text'] },
                title: { type: 'string' },
                data: { type: 'string' },
                duration: { type: 'integer' },
                downloadable: { type: 'boolean' },
              },
            },
          },
          quiz: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Quiz: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          module: { type: 'string' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questionText: { type: 'string' },
                questionImage: { type: 'string' },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      image: { type: 'string' },
                      isCorrect: { type: 'boolean' },
                    },
                  },
                },
                points: { type: 'integer' },
              },
            },
          },
          passingScore: { type: 'number' },
          maxAttempts: { type: 'integer' },
        },
      },
      TrainingSession: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          domain: { type: 'string' },
          location: { type: 'string' },
          date: { type: 'string', format: 'date-time' },
          timeSlot: { type: 'string', example: '14:00' },
          duration: { type: 'integer' },
          thumbnail: { type: 'string' },
          mode: { type: 'string', enum: ['offline', 'online'] },
          meetingLink: { type: 'string' },
          instructor: { type: 'string' },
          enrolledStaff: { type: 'array', items: { type: 'string' } },
          attendanceCode: { type: 'string' },
          attendance: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                staff: { type: 'string' },
                markedAt: { type: 'string', format: 'date-time' },
                status: { type: 'string', enum: ['present', 'absent'] },
              },
            },
          },
          status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      LearnerProgress: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          course: { type: 'string' },
          module: { type: 'string' },
          status: { type: 'string', enum: ['not_started', 'in_progress', 'completed'] },
          videoCompleted: { type: 'boolean' },
          videoPoints: { type: 'integer' },
          quizPassed: { type: 'boolean' },
          quizPoints: { type: 'integer' },
          proofOfWorkPoints: { type: 'integer' },
          totalModulePoints: { type: 'integer' },
          completedAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Gamification: {
        type: 'object',
        properties: {
          totalPoints: { type: 'integer' },
          badges: { type: 'array', items: { $ref: '#/components/schemas/Badge' } },
          streak: { $ref: '#/components/schemas/Streak' },
          nextBadge: {
            type: 'object',
            nullable: true,
            properties: {
              name: { type: 'string' },
              threshold: { type: 'integer' },
              pointsNeeded: { type: 'integer' },
            },
          },
        },
      },
      Badge: {
        type: 'object',
        properties: {
          name: { type: 'string', enum: ['rookie', 'silver', 'gold', 'premium'] },
          threshold: { type: 'integer' },
          earnedAt: { type: 'string', format: 'date-time' },
          icon: { type: 'string' },
        },
      },
      Streak: {
        type: 'object',
        properties: {
          current: { type: 'integer' },
          longest: { type: 'integer' },
          lastActivityDate: { type: 'string', format: 'date-time' },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          title: { type: 'string' },
          message: { type: 'string' },
          type: { type: 'string', enum: ['assignment', 'session_reminder', 'proof_update', 'badge_earned', 'streak', 'general'] },
          read: { type: 'boolean' },
          metadata: { type: 'object' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CertificationTest: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          title: { type: 'string' },
          description: { type: 'string' },
          domain: { type: 'string' },
          certificationTitle: { type: 'string' },
          questions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                questionText: { type: 'string' },
                questionImage: { type: 'string', nullable: true },
                options: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      text: { type: 'string' },
                      image: { type: 'string', nullable: true },
                      isCorrect: { type: 'boolean' },
                    },
                  },
                },
                points: { type: 'integer', default: 1 },
              },
            },
          },
          passingScore: { type: 'integer' },
          maxAttempts: { type: 'integer' },
          timeLimitMinutes: { type: 'integer' },
          shuffleQuestions: { type: 'boolean' },
          shuffleOptions: { type: 'boolean' },
          status: { type: 'string', enum: ['draft', 'active', 'archived'] },
          assignedStaff: { type: 'array', items: { type: 'string' } },
          createdBy: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      TestAttempt: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          test: { type: 'string' },
          score: { type: 'integer' },
          passed: { type: 'boolean' },
          correctCount: { type: 'integer' },
          totalQuestions: { type: 'integer' },
          violations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['tab_switch', 'minimize', 'copy_paste', 'screenshot', 'devtools'] },
                timestamp: { type: 'string', format: 'date-time' },
                details: { type: 'string' },
              },
            },
          },
          totalViolations: { type: 'integer' },
          startedAt: { type: 'string', format: 'date-time' },
          submittedAt: { type: 'string', format: 'date-time' },
          timeSpentSeconds: { type: 'integer' },
          wasOfflineSync: { type: 'boolean' },
          status: { type: 'string', enum: ['in_progress', 'submitted', 'graded', 'expired'] },
          attemptNumber: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Certification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          test: { type: 'string' },
          title: { type: 'string' },
          score: { type: 'integer' },
          earnedAt: { type: 'string', format: 'date-time' },
          attemptId: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ProofOfWork: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          user: { type: 'string' },
          course: { type: 'string' },
          fileUrl: { type: 'string' },
          fileType: { type: 'string' },
          fileSize: { type: 'integer' },
          status: { type: 'string', enum: ['submitted', 'approved', 'redo_requested'] },
          reviewedBy: { type: 'string' },
          reviewNote: { type: 'string' },
          submittedAt: { type: 'string', format: 'date-time' },
          reviewedAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
    },
    parameters: {
      PageParam: { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
      LimitParam: { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
      SearchParam: { name: 'search', in: 'query', schema: { type: 'string' }, description: 'Search by name, title, or empId' },
      SortByParam: { name: 'sortBy', in: 'query', schema: { type: 'string', default: 'createdAt' } },
      SortOrderParam: { name: 'sortOrder', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
    },
    responses: {
      Unauthorized: { description: 'Missing or invalid JWT token' },
      Forbidden: { description: 'Insufficient role permissions' },
      NotFound: { description: 'Resource not found' },
      ValidationError: { description: 'Request body validation failed' },
      ServerError: { description: 'Internal server error' },
    },
  },
  paths: {
    // ─── Authentication ──────────────────────────────────────
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'User Login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['empId', 'password'],
                properties: {
                  empId: { type: 'string', example: 'ADM-001' },
                  password: { type: 'string', example: 'password123' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Login successful — returns access token, refresh token, and user data' },
          401: { $ref: '#/components/responses/Unauthorized' },
          400: { $ref: '#/components/responses/ValidationError' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Refresh Access Token',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['refreshToken'], properties: { refreshToken: { type: 'string' } } } } },
        },
        responses: {
          200: { description: 'New token pair returned' },
          401: { description: 'Invalid or expired refresh token' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Logout',
        description: 'Invalidates the refresh token in Redis',
        responses: { 200: { description: 'Logged out successfully' } },
      },
    },
    '/auth/change-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Change Password',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['currentPassword', 'newPassword'], properties: { currentPassword: { type: 'string' }, newPassword: { type: 'string', minLength: 8 } } } } },
        },
        responses: {
          200: { description: 'Password changed successfully' },
          400: { description: 'Current password incorrect' },
        },
      },
    },

    // ─── Users ───────────────────────────────────────────────
    '/users': {
      get: {
        tags: ['Users'],
        summary: 'List Users',
        description: 'Admin sees all. Manager sees only coaches and staff.',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/SearchParam' },
          { name: 'role', in: 'query', schema: { type: 'string', enum: ['manager', 'coach', 'staff'] } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'offboarded'] } },
          { $ref: '#/components/parameters/SortByParam' },
          { $ref: '#/components/parameters/SortOrderParam' },
        ],
        responses: {
          200: { description: 'Paginated user list' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
      post: {
        tags: ['Users'],
        summary: 'Create User',
        description: 'Admin can create any role. Manager can create coach and staff only.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password', 'role'],
                properties: {
                  name: { type: 'string', example: 'John Doe' },
                  email: { type: 'string', format: 'email' },
                  phone: { type: 'string' },
                  password: { type: 'string', minLength: 8 },
                  role: { type: 'string', enum: ['manager', 'coach', 'staff'] },
                  domain: { type: 'string' },
                  location: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          201: { description: 'User created' },
          400: { $ref: '#/components/responses/ValidationError' },
          403: { description: 'Manager cannot create manager role' },
        },
      },
    },
    '/users/metadata': {
      get: {
        tags: ['Users'],
        summary: 'Get User Metadata',
        description: 'Returns available domains and locations for dropdowns',
        responses: { 200: { description: 'Domains and locations list' } },
      },
    },
    '/users/{id}': {
      get: {
        tags: ['Users'],
        summary: 'Get User Details',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      patch: {
        tags: ['Users'],
        summary: 'Update User',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { name: { type: 'string' }, email: { type: 'string' }, phone: { type: 'string' }, domain: { type: 'string' }, location: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'User updated' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete User (soft delete)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User deleted' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
    },
    '/users/{id}/offboard': {
      post: {
        tags: ['Users'],
        summary: 'Off-board User',
        description: 'Sets user status to offboarded. They lose platform access.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User offboarded' } },
      },
    },
    '/users/{id}/onboard': {
      post: {
        tags: ['Users'],
        summary: 'Re-onboard User',
        description: 'Restores offboarded user to active status.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'User re-onboarded' } },
      },
    },
    '/users/{id}/reset-password': {
      post: {
        tags: ['Users'],
        summary: 'Reset User Password',
        description: 'Admin resets a user password. User will be prompted to change on next login.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['newPassword'], properties: { newPassword: { type: 'string', minLength: 8 } } } } },
        },
        responses: { 200: { description: 'Password reset' } },
      },
    },

    // ─── Courses ─────────────────────────────────────────────
    '/courses': {
      get: {
        tags: ['Courses'],
        summary: 'List Courses',
        description: 'Admin/Manager see all. Coach sees only assigned. Staff sees only enrolled.',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/SearchParam' },
          { name: 'domain', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'active', 'archived'] } },
          { name: 'coach', in: 'query', schema: { type: 'string' }, description: 'Filter by coach ID (admin/manager only)' },
          { $ref: '#/components/parameters/SortByParam' },
          { $ref: '#/components/parameters/SortOrderParam' },
        ],
        responses: { 200: { description: 'Paginated course list' } },
      },
      post: {
        tags: ['Courses'],
        summary: 'Create Course',
        description: 'Admin and Manager only.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'description'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  domain: { type: 'string' },
                  thumbnail: { type: 'string' },
                  passingThreshold: { type: 'number', default: 70 },
                  proofOfWorkEnabled: { type: 'boolean', default: false },
                  proofOfWorkInstructions: { type: 'string' },
                  proofOfWorkMandatory: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Course created' }, 400: { $ref: '#/components/responses/ValidationError' } },
      },
    },
    '/courses/{id}': {
      get: { tags: ['Courses'], summary: 'Get Course Detail', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Course details with populated coach and modules' }, 404: { $ref: '#/components/responses/NotFound' } } },
      patch: { tags: ['Courses'], summary: 'Update Course', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, domain: { type: 'string' }, status: { type: 'string', enum: ['draft', 'active', 'archived'] } } } } } }, responses: { 200: { description: 'Course updated' } } },
      delete: { tags: ['Courses'], summary: 'Delete Course', description: 'Cascades: deletes modules, quizzes, progress records, and gamification entries.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Course deleted' } } },
    },
    '/courses/{id}/assign': {
      post: {
        tags: ['Courses'],
        summary: 'Assign Coach and Staff to Course',
        description: 'Creates LearnerProgress and Gamification records for new staff. Publishes notification via RabbitMQ.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', properties: { coachId: { type: 'string' }, staffIds: { type: 'array', items: { type: 'string' } } } } } },
        },
        responses: { 200: { description: 'Staff and coach assigned' } },
      },
    },
    '/courses/{id}/modules': {
      get: { tags: ['Courses'], summary: 'List Modules for Course', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Array of modules for the course' } } },
    },
    '/courses/{id}/analytics': {
      get: { tags: ['Courses'], summary: 'Get Course Analytics', description: 'Per-learner and per-module stats. Admin, Manager, Coach.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Course analytics data' } } },
    },

    // ─── Modules ─────────────────────────────────────────────
    '/modules': {
      get: {
        tags: ['Modules'],
        summary: 'List Modules',
        parameters: [{ $ref: '#/components/parameters/PageParam' }, { $ref: '#/components/parameters/LimitParam' }, { name: 'course', in: 'query', schema: { type: 'string' } }],
        responses: { 200: { description: 'Paginated module list' } },
      },
      post: {
        tags: ['Modules'],
        summary: 'Create Module',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'courseId', 'order'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  courseId: { type: 'string' },
                  order: { type: 'integer' },
                  contents: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: ['video', 'text'] }, title: { type: 'string' }, data: { type: 'string' }, duration: { type: 'integer' }, downloadable: { type: 'boolean' } } } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Module created' } },
      },
    },
    '/modules/{id}': {
      get: { tags: ['Modules'], summary: 'Get Module Detail', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Module with contents and quiz' } } },
      patch: { tags: ['Modules'], summary: 'Update Module', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, order: { type: 'integer' }, contents: { type: 'array', items: { type: 'object' } } } } } } }, responses: { 200: { description: 'Module updated' } } },
      delete: { tags: ['Modules'], summary: 'Delete Module', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Module deleted' } } },
    },

    // ─── Quizzes ─────────────────────────────────────────────
    '/quizzes': {
      post: {
        tags: ['Quizzes'],
        summary: 'Create Quiz',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['moduleId', 'questions', 'passingScore'],
                properties: {
                  moduleId: { type: 'string' },
                  passingScore: { type: 'number', description: 'Pass percentage (e.g. 70)' },
                  maxAttempts: { type: 'integer', default: 3 },
                  questions: { type: 'array', items: { type: 'object', properties: { questionText: { type: 'string' }, questionImage: { type: 'string' }, options: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, image: { type: 'string' }, isCorrect: { type: 'boolean' } } } }, points: { type: 'integer', default: 1 } } } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Quiz created and linked to module' } },
      },
    },
    '/quizzes/{id}': {
      get: { tags: ['Quizzes'], summary: 'Get Quiz', description: 'For staff: isCorrect is hidden from options.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Quiz data' } } },
      patch: { tags: ['Quizzes'], summary: 'Update Quiz', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object' } } } }, responses: { 200: { description: 'Quiz updated' } } },
      delete: { tags: ['Quizzes'], summary: 'Delete Quiz', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Quiz deleted' } } },
    },
    '/quizzes/{id}/attempt': {
      post: {
        tags: ['Quizzes'],
        summary: 'Submit Quiz Attempt',
        description: 'Staff only. Auto-grades, awards 30 points if passed. Triggers module completion check and badge evaluation.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['answers'], properties: { answers: { type: 'array', items: { type: 'object', properties: { questionIndex: { type: 'integer' }, selectedOption: { type: 'integer' } } } } } } } },
        },
        responses: { 200: { description: 'Quiz graded — returns score, passed status, points earned' }, 400: { description: 'No attempts remaining' } },
      },
    },

    // ─── Training Sessions ───────────────────────────────────
    '/sessions': {
      get: {
        tags: ['Training Sessions'],
        summary: 'List Sessions',
        description: 'Auto-syncs stale statuses before returning. Coach sees only their sessions. Staff sees only enrolled.',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { $ref: '#/components/parameters/SearchParam' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] } },
          { name: 'domain', in: 'query', schema: { type: 'string' } },
          { name: 'dateFrom', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'dateTo', in: 'query', schema: { type: 'string', format: 'date' } },
          { $ref: '#/components/parameters/SortByParam' },
          { $ref: '#/components/parameters/SortOrderParam' },
        ],
        responses: { 200: { description: 'Paginated session list' } },
      },
      post: {
        tags: ['Training Sessions'],
        summary: 'Create Session',
        description: 'Admin/Manager only. Publishes notification to enrolled staff via RabbitMQ.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'date', 'timeSlot', 'duration', 'instructor'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  domain: { type: 'string' },
                  location: { type: 'string' },
                  date: { type: 'string', format: 'date' },
                  timeSlot: { type: 'string', example: '14:00' },
                  duration: { type: 'integer', description: 'Minutes' },
                  mode: { type: 'string', enum: ['offline', 'online'], default: 'offline' },
                  meetingLink: { type: 'string', description: 'Required if mode is online' },
                  thumbnail: { type: 'string' },
                  instructor: { type: 'string' },
                  enrolledStaff: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Session created' } },
      },
    },
    '/sessions/{id}': {
      get: { tags: ['Training Sessions'], summary: 'Get Session Detail', description: 'Syncs status before returning.', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Session with populated instructor, staff, and attendance' } } },
      patch: { tags: ['Training Sessions'], summary: 'Update Session', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, date: { type: 'string' }, timeSlot: { type: 'string' }, duration: { type: 'integer' }, mode: { type: 'string', enum: ['offline', 'online'] }, meetingLink: { type: 'string' }, status: { type: 'string', enum: ['upcoming', 'ongoing', 'completed', 'cancelled'] } } } } } }, responses: { 200: { description: 'Session updated' } } },
      delete: { tags: ['Training Sessions'], summary: 'Delete Session', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Session deleted' } } },
    },
    '/sessions/{id}/attendance-code': {
      post: {
        tags: ['Training Sessions'],
        summary: 'Generate Attendance Code',
        description: 'Coach only. Generates 6-digit code with 30-minute expiry. Only works for upcoming sessions.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Returns attendanceCode and expiresAt' } },
      },
    },
    '/sessions/{id}/mark-attendance': {
      post: {
        tags: ['Training Sessions'],
        summary: 'Mark Attendance',
        description: 'Staff only. Validates code, checks expiry, marks present. Awards 30 gamification points.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['attendanceCode'], properties: { attendanceCode: { type: 'string', example: '482916' } } } } },
        },
        responses: { 200: { description: 'Attendance marked + 30 points awarded' }, 400: { description: 'Invalid or expired code' } },
      },
    },

    // ─── Learner Progress ────────────────────────────────────
    '/progress': {
      get: {
        tags: ['Learner Progress'],
        summary: 'Get Progress Records',
        description: 'Coach sees progress for their courses. Staff sees own progress only.',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'course', in: 'query', schema: { type: 'string' } },
          { name: 'module', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated progress records' } },
      },
      patch: {
        tags: ['Learner Progress'],
        summary: 'Update Content Progress',
        description: 'Staff marks content as viewed. Awards 30 videoPoints when all content in module completed. Triggers module completion check.',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['moduleId', 'contentIndex'], properties: { moduleId: { type: 'string' }, contentIndex: { type: 'integer', minimum: 0 } } } } },
        },
        responses: { 200: { description: 'Progress updated' } },
      },
    },
    '/progress/{userId}': {
      get: {
        tags: ['Learner Progress'],
        summary: 'Get User Progress',
        description: 'Returns all progress grouped by course. Staff can only view own. Repairs stuck in_progress records.',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Progress grouped by course with module details' } },
      },
    },

    // ─── Proof of Work ───────────────────────────────────────
    '/proof-of-work': {
      get: {
        tags: ['Proof of Work'],
        summary: 'List Proof Submissions',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['submitted', 'approved', 'redo_requested'] } },
          { name: 'courseId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Paginated proof submissions' } },
      },
    },
    '/proof-of-work/upload': {
      post: {
        tags: ['Proof of Work'],
        summary: 'Upload Proof of Work',
        description: 'Staff only. Uploads file to Cloudinary. Publishes notification via RabbitMQ.',
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', required: ['file', 'courseId'], properties: { file: { type: 'string', format: 'binary' }, courseId: { type: 'string' } } } } },
        },
        responses: { 201: { description: 'Proof uploaded' } },
      },
    },
    '/proof-of-work/{id}/review': {
      post: {
        tags: ['Proof of Work'],
        summary: 'Review Proof of Work',
        description: 'Coach only. Approve awards 30 points. Publishes notification.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['status'], properties: { status: { type: 'string', enum: ['approved', 'redo_requested'] }, reviewNote: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Proof reviewed' } },
      },
    },

    // ─── Gamification ────────────────────────────────────────
    '/gamification/{userId}': {
      get: {
        tags: ['Gamification'],
        summary: 'Get User Gamification Data',
        description: 'Returns points, badges, streak, and next badge info. Reconciles points from LearnerProgress + session attendance.',
        parameters: [{ name: 'userId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Gamification data with reconciled points' } },
      },
    },
    '/gamification/streak': {
      post: {
        tags: ['Gamification'],
        summary: 'Update Daily Streak',
        description: 'Staff only. Called on learning activity. Increments streak if new day, resets if gap.',
        responses: { 200: { description: 'Streak updated' } },
      },
    },

    // ─── Notifications ───────────────────────────────────────
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'Get User Notifications',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'read', in: 'query', schema: { type: 'boolean' }, description: 'Filter by read status (false = unread only)' },
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean' } },
        ],
        responses: { 200: { description: 'Paginated notification list' } },
      },
    },
    '/notifications/{id}/read': {
      post: {
        tags: ['Notifications'],
        summary: 'Mark Notification as Read',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Notification marked as read' } },
      },
    },
    '/notifications/stream': {
      get: {
        tags: ['Notifications'],
        summary: 'SSE Notification Stream',
        description: 'Server-Sent Events endpoint for real-time push notifications. Pass JWT as query param. Sends heartbeat every 30s.',
        security: [],
        parameters: [{ name: 'token', in: 'query', required: true, schema: { type: 'string' }, description: 'JWT access token' }],
        responses: { 200: { description: 'SSE stream — data events contain notification JSON' } },
      },
    },

    // ─── Upload ──────────────────────────────────────────────
    '/upload': {
      post: {
        tags: ['Upload'],
        summary: 'Upload File to Cloudinary',
        requestBody: {
          required: true,
          content: { 'multipart/form-data': { schema: { type: 'object', required: ['file'], properties: { file: { type: 'string', format: 'binary' }, folder: { type: 'string', description: 'Cloudinary folder (e.g. courses, avatars)' } } } } },
        },
        responses: { 200: { description: 'Returns url, publicId, format, size' } },
      },
    },

    // ─── Reports ─────────────────────────────────────────────
    '/reports/learner-progress': {
      get: {
        tags: ['Reports'],
        summary: 'Generate Learner Progress Report',
        parameters: [
          { name: 'format', in: 'query', required: true, schema: { type: 'string', enum: ['pdf', 'excel'] } },
          { name: 'courseId', in: 'query', schema: { type: 'string' } },
          { name: 'userId', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Downloadable PDF or Excel file' } },
      },
    },
    '/reports/session-attendance': {
      get: {
        tags: ['Reports'],
        summary: 'Generate Session Attendance Report',
        parameters: [
          { name: 'format', in: 'query', required: true, schema: { type: 'string', enum: ['pdf', 'excel'] } },
          { name: 'sessionId', in: 'query', required: true, schema: { type: 'string' } },
        ],
        responses: { 200: { description: 'Downloadable attendance report' } },
      },
    },

    // ─── Dashboard ───────────────────────────────────────────
    '/dashboard/stats': {
      get: {
        tags: ['Dashboard'],
        summary: 'Get Dashboard Statistics',
        description: 'Returns counts for active courses, upcoming sessions, staff, coaches, managers. Cached in Redis (5 min TTL).',
        responses: { 200: { description: 'Dashboard stat counts' } },
      },
    },

    // ─── Certification Tests ────────────────────────────────
    '/tests': {
      get: {
        tags: ['Tests'],
        summary: 'List Certification Tests',
        description: 'Admin/Manager sees all tests. Staff sees only assigned active tests with attempt and certification status.',
        parameters: [
          { $ref: '#/components/parameters/PageParam' },
          { $ref: '#/components/parameters/LimitParam' },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['draft', 'active', 'archived'] } },
          { name: 'includeCompleted', in: 'query', description: 'Staff only: include certified/exhausted tests', schema: { type: 'string', enum: ['true', 'false'] } },
        ],
        responses: {
          200: {
            description: 'List of tests',
            content: { 'application/json': { schema: { type: 'object', properties: { success: { type: 'boolean' }, data: { type: 'object', properties: { tests: { type: 'array', items: { $ref: '#/components/schemas/CertificationTest' } }, total: { type: 'integer' } } } } } } },
          },
        },
      },
      post: {
        tags: ['Tests'],
        summary: 'Create Certification Test',
        description: 'Admin/Manager only. Creates a new certification test with questions.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'certificationTitle', 'questions', 'passingScore'],
                properties: {
                  title: { type: 'string', example: 'Electrician Level 1' },
                  description: { type: 'string' },
                  domain: { type: 'string', example: 'Electrical' },
                  certificationTitle: { type: 'string', example: 'Experienced Electrician - 1' },
                  passingScore: { type: 'integer', example: 70 },
                  maxAttempts: { type: 'integer', default: 1 },
                  timeLimitMinutes: { type: 'integer', default: 60 },
                  shuffleQuestions: { type: 'boolean', default: true },
                  shuffleOptions: { type: 'boolean', default: false },
                  status: { type: 'string', enum: ['draft', 'active'], default: 'draft' },
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        questionText: { type: 'string' },
                        questionImage: { type: 'string', nullable: true },
                        options: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, image: { type: 'string', nullable: true }, isCorrect: { type: 'boolean' } } } },
                        points: { type: 'integer', default: 1 },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: { 201: { description: 'Test created' }, 400: { $ref: '#/components/responses/ValidationError' } },
      },
    },
    '/tests/{id}': {
      get: {
        tags: ['Tests'],
        summary: 'Get Test by ID',
        description: 'Returns test details. Staff gets sanitized version (no isCorrect). Includes myAttempts and myCertification for staff.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Test details' }, 404: { $ref: '#/components/responses/NotFound' } },
      },
      patch: {
        tags: ['Tests'],
        summary: 'Update Test',
        description: 'Admin/Manager only.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' }, status: { type: 'string', enum: ['draft', 'active', 'archived'] }, passingScore: { type: 'integer' }, maxAttempts: { type: 'integer' }, timeLimitMinutes: { type: 'integer' }, questions: { type: 'array' } } } } },
        },
        responses: { 200: { description: 'Test updated' } },
      },
      delete: {
        tags: ['Tests'],
        summary: 'Delete Test',
        description: 'Admin/Manager only. Also deletes all associated attempts and certifications.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { 200: { description: 'Test deleted with all attempts and certifications' } },
      },
    },
    '/tests/{id}/assign': {
      post: {
        tags: ['Tests'],
        summary: 'Assign Staff to Test',
        description: 'Admin/Manager only. Notifies newly assigned staff.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['staffIds'], properties: { staffIds: { type: 'array', items: { type: 'string' }, example: ['userId1', 'userId2'] } } } } },
        },
        responses: { 200: { description: 'Staff assigned and notified' } },
      },
    },
    '/tests/{id}/start': {
      post: {
        tags: ['Tests'],
        summary: 'Start Test Attempt',
        description: 'Staff only. Returns questions (without isCorrect) and creates an in-progress attempt. Resumes if an existing attempt is in progress.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Test started or resumed',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        attemptId: { type: 'string' },
                        questions: { type: 'array' },
                        timeLimitMinutes: { type: 'integer' },
                        startedAt: { type: 'string', format: 'date-time' },
                        resuming: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'No attempts remaining or already certified' },
        },
      },
    },
    '/tests/{id}/submit': {
      post: {
        tags: ['Tests'],
        summary: 'Submit Test Answers',
        description: 'Staff only. Auto-grades the test, awards certification if passed, records proctoring violations.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['attemptId', 'answers'],
                properties: {
                  attemptId: { type: 'string' },
                  answers: { type: 'array', items: { type: 'object', properties: { questionIndex: { type: 'integer' }, selectedOption: { type: 'integer' } } } },
                  violations: { type: 'array', items: { type: 'object', properties: { type: { type: 'string', enum: ['tab_switch', 'minimize', 'copy_paste', 'screenshot', 'devtools'] }, timestamp: { type: 'string', format: 'date-time' }, details: { type: 'string' } } } },
                  timeSpentSeconds: { type: 'integer' },
                  wasOfflineSync: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Test graded',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        score: { type: 'integer' },
                        passed: { type: 'boolean' },
                        correctCount: { type: 'integer' },
                        totalQuestions: { type: 'integer' },
                        certification: { type: 'object', nullable: true },
                        attemptsRemaining: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/tests/{id}/violation': {
      post: {
        tags: ['Tests'],
        summary: 'Report Proctoring Violation',
        description: 'Staff only. Records a proctoring violation (tab switch, copy/paste, etc.) during an active test attempt.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['attemptId', 'type'], properties: { attemptId: { type: 'string' }, type: { type: 'string', enum: ['tab_switch', 'minimize', 'copy_paste', 'screenshot', 'devtools'] }, details: { type: 'string' } } } } },
        },
        responses: { 200: { description: 'Violation recorded' } },
      },
    },

    // ─── Certifications ─────────────────────────────────────
    '/certifications': {
      get: {
        tags: ['Certifications'],
        summary: 'Get User Certifications',
        description: 'Staff sees their own. Admin/Manager/Coach can see any user\'s certifications by passing userId.',
        parameters: [
          { name: 'userId', in: 'query', description: 'User ID (admin/manager/coach can view others)', schema: { type: 'string' } },
        ],
        responses: {
          200: {
            description: 'List of certifications',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: { type: 'array', items: { $ref: '#/components/schemas/Certification' } },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ─── Admin Utilities ────────────────────────────────────
    '/admin/recent-activities': {
      get: {
        tags: ['Admin'],
        summary: 'Get Recent Platform Activity',
        description: 'Admin/Manager. Aggregates recent events from all collections (progress, tests, certifications, proofs, attendance, new users) into a unified timeline.',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 5 } },
        ],
        responses: {
          200: {
            description: 'Paginated activity feed sorted newest first',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    data: {
                      type: 'object',
                      properties: {
                        activities: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              type: { type: 'string', enum: ['module_completed', 'test_passed', 'test_failed', 'certification_earned', 'proof_submitted', 'proof_approved', 'proof_redo_requested', 'attendance_marked', 'user_created'] },
                              icon: { type: 'string' },
                              user: { type: 'object', properties: { name: { type: 'string' }, empId: { type: 'string' } } },
                              message: { type: 'string' },
                              timestamp: { type: 'string', format: 'date-time' },
                              metadata: { type: 'object' },
                            },
                          },
                        },
                        pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, hasMore: { type: 'boolean' }, totalPages: { type: 'integer' } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/admin/cron-status': {
      get: {
        tags: ['Admin'],
        summary: 'Check Cron Job Health',
        description: 'Admin only. Shows last run time and health status of the session sync cron job.',
        responses: { 200: { description: 'Cron status with last run time and health' } },
      },
    },
    '/admin/repair-proofs': {
      get: {
        tags: ['Admin'],
        summary: 'Find and Repair Broken PDF Proofs',
        description: 'Admin only. Scans all PDF proofs for 0-byte files and resets broken ones to redo_requested for re-upload.',
        responses: { 200: { description: 'Repair report with count of fixed records' } },
      },
    },

    // ─── Utilities ──────────────────────────────────────────
    '/health': {
      get: {
        tags: ['Utilities'],
        summary: 'Health Check',
        description: 'Returns server status. No auth required.',
        security: [],
        responses: {
          200: {
            description: 'Server is running',
            content: { 'application/json': { schema: { type: 'object', properties: { status: { type: 'string', example: 'ok' }, timestamp: { type: 'string', format: 'date-time' } } } } },
          },
        },
      },
    },
    '/proxy-pdf': {
      get: {
        tags: ['Utilities'],
        summary: 'Proxy PDF from Cloudinary',
        description: 'Fetches a PDF from Cloudinary to bypass CORS restrictions. Only allows Cloudinary URLs.',
        parameters: [{ name: 'url', in: 'query', required: true, schema: { type: 'string' }, description: 'Cloudinary PDF URL' }],
        responses: {
          200: { description: 'PDF file stream', content: { 'application/pdf': {} } },
          403: { description: 'Non-Cloudinary URL rejected' },
        },
      },
    },
    '/seed/users': {
      get: {
        tags: ['Utilities'],
        summary: 'Seed Admin User',
        description: 'Development utility. Creates default admin user if not exists. No auth required.',
        security: [],
        responses: { 200: { description: 'Admin user seeded or already exists' } },
      },
    },
    '/seed/users/delete': {
      delete: {
        tags: ['Utilities'],
        summary: 'Delete All Seeded Data',
        description: 'Development utility. Removes all seeded users. No auth required.',
        security: [],
        responses: { 200: { description: 'Seeded data deleted' } },
      },
    },
  },
} as const;

export default spec;
