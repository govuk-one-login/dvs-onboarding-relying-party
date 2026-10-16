import pino from "pino";

export const logger = pino({
  name: "di-relying-party-admin-tool-frontend",
  level: process.env.LOGS_LEVEL || "debug",
});
