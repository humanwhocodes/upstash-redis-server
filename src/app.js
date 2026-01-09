/**
 * @fileoverview Application factory for the Upstash Redis server.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./app.d.ts" */

import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { Redis } from "ioredis";

/**
 * Creates the Hono app with the given configuration
 * @param {object} config - Configuration options
 * @param {string} config.token - Required Bearer token for authentication
 * @param {string} [config.redisUrl] - Redis connection URL (optional, defaults to redis://localhost:6379)
 * @returns {Hono} The configured Hono app
 */
function createApp(config) {
	const app = new Hono();

	const { token, redisUrl = "redis://localhost:6379" } = config;

	// Validate required configuration
	if (!token) {
		throw new Error("token is required in configuration");
	}

	// Create Redis client
	const redis = new Redis(redisUrl);

	// Handle Redis connection errors
	redis.on("error", (/** @type {Error} */ err) => {
		console.error("Redis connection error:", err);
	});

	// Apply bearer auth middleware
	app.use("/", bearerAuth({ token }));

	/**
	 * POST / endpoint - Executes a single Redis command
	 * Supports Upstash Redis REST API format
	 */
	app.post("/", async (c) => {
		// Parse request body
		/** @type {any} */
		let body;

		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "Invalid JSON body" }, 400);
		}

		// Support both single command and array format
		// Single command: ["GET", "key"]
		// The Upstash API uses this format
		if (!Array.isArray(body)) {
			return c.json(
				{ error: "Request body must be an array of command and arguments" },
				400,
			);
		}

		if (body.length === 0) {
			return c.json({ error: "Command array cannot be empty" }, 400);
		}

		try {
			// Execute Redis command
			// ioredis automatically handles command name and arguments
			const result = await redis.call(body[0], ...body.slice(1));
			
			// Return result in Upstash format
			return c.json({ result });
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return c.json(
				{ error: `Failed to execute Redis command: ${errorMessage}` },
				500,
			);
		}
	});

	/**
	 * POST /pipeline endpoint - Executes multiple Redis commands in a pipeline
	 * Supports Upstash Redis REST API pipeline format
	 */
	app.post("/pipeline", async (c) => {
		// Parse request body
		/** @type {any} */
		let body;

		try {
			body = await c.req.json();
		} catch {
			return c.json({ error: "Invalid JSON body" }, 400);
		}

		// Pipeline expects an array of command arrays
		if (!Array.isArray(body)) {
			return c.json(
				{ error: "Request body must be an array of commands" },
				400,
			);
		}

		if (body.length === 0) {
			return c.json({ error: "Pipeline cannot be empty" }, 400);
		}

		// Validate all commands are arrays
		for (let i = 0; i < body.length; i++) {
			if (!Array.isArray(body[i])) {
				return c.json(
					{ error: `Command at index ${i} must be an array` },
					400,
				);
			}
			if (body[i].length === 0) {
				return c.json(
					{ error: `Command at index ${i} cannot be empty` },
					400,
				);
			}
		}

		try {
			const pipeline = redis.pipeline();

			// Add all commands to pipeline
			for (const command of body) {
				pipeline.call(command[0], ...command.slice(1));
			}

			// Execute pipeline
			const results = await pipeline.exec();

			// Transform results to Upstash format
			// ioredis returns [[error, result], ...]
			if (!results) {
				return c.json(
					{ error: "Pipeline execution returned no results" },
					500,
				);
			}

			const response = results.map((/** @type {[Error | null, any]} */ [error, result]) => {
				if (error) {
					return { error: error.message };
				}
				return { result };
			});

			return c.json(response);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			return c.json(
				{ error: `Failed to execute pipeline: ${errorMessage}` },
				500,
			);
		}
	});

	// Cleanup on app close
	app.onError((err, c) => {
		console.error("Application error:", err);
		
		// Check if it's an HTTPException from Hono (e.g., bearer auth error)
		// @ts-ignore - HTTPException has a status property
		if (err && typeof err.status === "number") {
			// @ts-ignore
			return err.res || c.text("Unauthorized", err.status);
		}
		
		return c.json({ error: "Internal server error" }, 500);
	});

	return app;
}

export { createApp };
