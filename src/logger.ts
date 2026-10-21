import pino from "pino";

export const logger = pino({
  name: "di-dvs-rp",
  level: process.env.LOGS_LEVEL || "debug",
});
