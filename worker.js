// BullMQ worker — runs as a separate process: `node worker.js`
// Requires REDIS_URL to be set; exits gracefully if not.
"use strict";

if (!process.env.REDIS_URL) {
  console.log(JSON.stringify({ level: "info", msg: "worker.skipped", reason: "REDIS_URL not set" }));
  process.exit(0);
}

const { Worker } = require("bullmq");
const Redis = require("ioredis");
const nodemailer = require("nodemailer");

function log(level, msg, ctx) {
  console.log(JSON.stringify({ level, msg, ts: new Date().toISOString(), ...ctx }));
}

function makeConnection() {
  return new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
}

// ---- Email worker ----
let transporter = null;
function getTransporter() {
  if (!process.env.SMTP_HOST) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT ?? 587) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

const emailWorker = new Worker(
  "email",
  async (job) => {
    const { to, subject, html } = job.data;
    const client = getTransporter();
    if (!client) {
      log("warn", "email.skipped", { reason: "smtp_not_configured", subject, to });
      return;
    }
    await client.sendMail({ from: process.env.SMTP_FROM ?? "noreply@accsmarkets.org", to, subject, html });
    log("info", "email.sent", { subject, to });
  },
  { connection: makeConnection(), concurrency: 4 },
);

emailWorker.on("failed", (job, err) => {
  log("error", "email.job_failed", { jobId: job?.id, err: String(err) });
});

// ---- Sweep worker ----
const sweepWorker = new Worker(
  "sweep",
  async (job) => {
    const { task } = job.data;
    const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${base}/api/internal/sweep`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-sweep-secret": process.env.INTERNAL_SWEEP_SECRET ?? "",
      },
      body: JSON.stringify({ task }),
    });
    if (!res.ok) throw new Error(`sweep ${task} returned ${res.status}`);
    log("info", "sweep.done", { task });
  },
  { connection: makeConnection(), concurrency: 1 },
);

sweepWorker.on("failed", (job, err) => {
  log("error", "sweep.job_failed", { jobId: job?.id, task: job?.data?.task, err: String(err) });
});

log("info", "worker.started", { queues: ["email", "sweep"] });

// Graceful shutdown
async function shutdown(signal) {
  log("info", "worker.shutting_down", { signal });
  await emailWorker.close();
  await sweepWorker.close();
  process.exit(0);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
