#!/usr/bin/env node

/**
 * @fileoverview Upstash Redis server using Hono.
 * @author Nicholas C. Zakas
 */

/* @ts-self-types="./server.d.ts" */

// @ts-ignore - @hono/node-server may not have types
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

// Get configuration from environment variables
const token = process.env.URS_TOKEN;
const port = parseInt(process.env.PORT || "8080", 10);
const redisUrl = process.env.REDIS_URL;

// Validate required configuration
if (!token) {
	console.error(
		"Error: URS_TOKEN environment variable is required",
	);
	process.exit(1);
}

const app = createApp({ token, redisUrl });

console.log(`Starting Upstash Redis server on port ${port}...`);
console.log(`Redis URL: ${redisUrl || "redis://localhost:6379"}`);

serve({
	fetch: app.fetch,
	port,
});
