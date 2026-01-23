import { z } from 'zod';
import { insertUserSchema, insertActivitySchema, insertNotificationSchema, insertGalleryPhotoSchema, insertMessageSchema, insertResidentProfileSchema, users, activities, notifications, galleryPhotos, messages, residentProfiles } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: z.object({
        role: z.enum(['admin', 'resident']),
        username: z.string().optional(),
        password: z.string().optional(),
        lotNumber: z.string().optional(),
        lastName: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ message: z.string() }),
      },
    },
    me: {
      method: 'GET' as const,
      path: '/api/auth/me',
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  activities: {
    list: {
      method: 'GET' as const,
      path: '/api/activities',
      responses: {
        200: z.array(z.custom<typeof activities.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/activities',
      input: insertActivitySchema,
      responses: {
        201: z.custom<typeof activities.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/activities/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  notifications: {
    list: {
      method: 'GET' as const,
      path: '/api/notifications',
      responses: {
        200: z.array(z.custom<typeof notifications.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/notifications',
      input: insertNotificationSchema,
      responses: {
        201: z.custom<typeof notifications.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/notifications/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  users: {
    list: {
      method: 'GET' as const,
      path: '/api/users',
      responses: {
        200: z.array(z.object({
          id: z.number(),
          firstName: z.string().nullable(),
          lastName: z.string().nullable(),
          lotNumber: z.string().nullable(),
        })),
      },
    },
  },
  residents: {
    list: {
      method: 'GET' as const,
      path: '/api/residents',
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/residents',
      input: z.object({
        lotNumber: z.string().min(1),
        lastName: z.string().min(1),
        firstName: z.string().optional(),
        phoneNumber: z.string().optional(),
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: 'PATCH' as const,
      path: '/api/residents/:id',
      input: z.object({
        lotNumber: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        firstName: z.string().optional(),
        phoneNumber: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/residents/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  weather: {
    get: {
      method: 'GET' as const,
      path: '/api/weather',
      responses: {
        200: z.object({
          temp: z.number(),
          condition: z.string(),
          location: z.string(),
          forecast: z.array(z.object({
            day: z.string(),
            temp: z.number(),
            condition: z.string(),
          })),
        }),
      },
    },
  },
  gallery: {
    list: {
      method: 'GET' as const,
      path: '/api/gallery',
      responses: {
        200: z.array(z.custom<typeof galleryPhotos.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/gallery',
      input: insertGalleryPhotoSchema,
      responses: {
        201: z.custom<typeof galleryPhotos.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/gallery/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  profiles: {
    list: {
      method: 'GET' as const,
      path: '/api/profiles',
      responses: {
        200: z.array(z.custom<typeof residentProfiles.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/profiles',
      input: z.object({
        firstName: z.string().min(1, "First name is required"),
      }),
      responses: {
        201: z.custom<typeof residentProfiles.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    delete: {
      method: 'DELETE' as const,
      path: '/api/profiles/:id',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
    select: {
      method: 'POST' as const,
      path: '/api/profiles/select',
      input: z.object({
        profileId: z.number(),
      }),
      responses: {
        200: z.custom<typeof residentProfiles.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  messages: {
    community: {
      method: 'GET' as const,
      path: '/api/messages/community',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    direct: {
      method: 'GET' as const,
      path: '/api/messages/direct',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    conversation: {
      method: 'GET' as const,
      path: '/api/messages/conversation/:userId',
      responses: {
        200: z.array(z.custom<typeof messages.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/messages',
      input: z.object({
        content: z.string().min(1),
        recipientId: z.number().optional(),
        senderProfileId: z.number().optional(),
        recipientProfileId: z.number().optional(),
      }),
      responses: {
        201: z.custom<typeof messages.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    markRead: {
      method: 'PATCH' as const,
      path: '/api/messages/:id/read',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
  },
};

export type LoginRequest = {
  role: 'admin' | 'resident';
  username?: string;
  password?: string;
  lotNumber?: string;
  lastName?: string;
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
