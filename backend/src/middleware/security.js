/**
 * Security Middleware: Security Headers and In-Memory Rate Limiting
 */

// Simple in-memory rate limiter for development and API protection
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests per minute

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || "127.0.0.1";
  const now = Date.now();

  let entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 1 };
    rateLimitMap.set(ip, entry);
  } else {
    entry.count++;
  }

  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please wait a minute before retrying.",
    });
  }

  next();
}

// Clean up old rate limit records periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(ip);
    }
  }
}, 2 * RATE_LIMIT_WINDOW_MS).unref();

function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
}

function globalErrorHandler(err, req, res, next) {
  console.error("Unhandled server error:", err.message || err);

  const isProduction = process.env.NODE_ENV === "production";
  let safeMessage = err.message || "An unexpected internal server error occurred.";

  // Sanitize any accidentally leaked passwords or connection strings
  safeMessage = safeMessage
    .replace(/password(=|:\s*)[^\s;&]+/gi, "password=***")
    .replace(/:\/\/([^:]+):([^@]+)@/g, "://$1:***@");

  res.status(err.status || 500).json({
    success: false,
    message: isProduction ? "An internal server error occurred." : safeMessage,
  });
}

module.exports = {
  rateLimiter,
  securityHeaders,
  globalErrorHandler,
};
