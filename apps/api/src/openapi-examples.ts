/**
 * Realistic example payloads for Swagger UI. Values mirror the seeded
 * fixture (admin@cleandrop.test, the 9 catalog services) so an evaluator
 * clicking through `/api/docs` sees the same shapes a real call returns.
 *
 * Kept in one file so additions touch one place — controllers import
 * named constants and pass them to `@ApiResponse({ schema: { example } })`.
 */

const SERVICE_EXAMPLE = {
  id: "8b8d1a2e-1b2c-4f5a-9d3e-2a7c8f4b9e10",
  name: "Standard Clean",
  description: "Bi-weekly tidy: kitchen, bathrooms, floors, surfaces.",
  category: "Residential",
  company: {
    id: "1c4f7a91-aaaa-4bbb-8ccc-9dddee012345",
    name: "Acme Cleaning S.r.l.",
  },
  status: "Active",
  durationMinutes: 90,
  basePriceCents: 12500,
  createdAt: "2026-05-01T09:14:22.118Z",
  updatedAt: "2026-05-01T09:14:22.118Z",
} as const;

export const examples = {
  login: {
    success: {
      accessToken:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZjBkLi4uIiwiZW1haWwiOiJhZG1pbkBjbGVhbmRyb3AudGVzdCIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxNjY0MDAwMCwiZXhwIjoxNzE2NjQwOTAwfQ.6kQ7mY...",
      refreshToken: "k7G2yQ8sNvR4dXcZbA9PtMfL3eHqUjVwYxBn1iOoEa0",
      user: {
        id: "4f0d8c2a-1234-4abc-9def-0123456789ab",
        email: "admin@cleandrop.test",
        role: "admin",
      },
    },
    invalidCredentials: {
      statusCode: 401,
      message: "Invalid email or password",
      error: "Unauthorized",
    },
    badBody: {
      statusCode: 400,
      message: "Validation failed",
      errors: [{ path: ["email"], message: "Invalid email" }],
    },
  },

  refresh: {
    success: {
      accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...new-access-token...",
      refreshToken: "Q9wRtY7uI2oP4aSdF6gHj8kL0zXcVbN1mQ3wErTyUiO",
    },
    invalid: {
      statusCode: 401,
      message: "Invalid refresh token",
      error: "Unauthorized",
    },
    reused: {
      statusCode: 401,
      message: "Refresh token reuse detected; session terminated",
      error: "Unauthorized",
    },
  },

  service: SERVICE_EXAMPLE,

  servicesList: {
    data: [
      SERVICE_EXAMPLE,
      {
        ...SERVICE_EXAMPLE,
        id: "a3c2b1d0-5678-49ef-bbbb-cccc01234567",
        name: "Deep Clean",
        description: "Quarterly deep clean: inside cabinets, appliances, baseboards.",
        durationMinutes: 240,
        basePriceCents: 28900,
      },
    ],
    total: 9,
    page: 1,
    pageSize: 10,
  },

  servicesSummary: {
    total: 9,
    active: 6,
    drafts: 2,
    avgBasePriceCents: 15889,
  },

  forbidden: {
    statusCode: 403,
    message: "Forbidden resource",
    error: "Forbidden",
  },

  unauthorized: {
    statusCode: 401,
    message: "Unauthorized",
    error: "Unauthorized",
  },
} as const;
