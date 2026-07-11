import swaggerJsdoc from "swagger-jsdoc";

export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Enterprise NMS API",
      version: "1.0.0",
      description:
        "REST API for the Enterprise Network Monitoring System. All endpoints (except /api/auth/login and /api/health) require a Bearer JWT.",
    },
    servers: [{ url: "/api" }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ["./src/routes/*.ts", "./dist/routes/*.js"],
});
