import "server-only";

export function requireCronSecret(req: Request) {
  const expected = process.env.JOB_QUEUE_CRON_SECRET;
  if (!expected) {
    const err: any = new Error("Missing env JOB_QUEUE_CRON_SECRET");
    err.status = 500;
    throw err;
  }

  const got = req.headers.get("x-cron-secret");
  if (!got || got !== expected) {
    const err: any = new Error("UNAUTHORIZED_CRON");
    err.status = 401;
    throw err;
  }
}

