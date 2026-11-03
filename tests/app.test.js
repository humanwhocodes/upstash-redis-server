/**
 * @fileoverview Tests for the Upstash Redis server app
 * @author Nicholas C. Zakas
 */

import assert from "node:assert";
import { Redis } from "ioredis";
import { createApp } from "../src/app.js";

describe("createApp", () => {
	describe("Configuration", () => {
		it("should throw an error when token is not provided", () => {
			assert.throws(
				() => {
					createApp({ token: "" });
				},
				{
					message: "token is required in configuration",
				},
			);
		});

		it("should create an app with valid configuration", () => {
			const app = createApp({ token: "test-token" });
			assert.ok(app);
		});
	});

	describe("Authentication", () => {
		it("should reject requests without Bearer token", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(["PING"]),
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 401);
		});

		it("should reject requests with invalid Bearer token", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer wrong-token",
				},
				body: JSON.stringify(["PING"]),
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 401);
		});
	});

	describe("POST / - Single command validation", () => {
		it("should reject invalid JSON body", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: "invalid json",
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 400);
			const json = await res.json();
			assert.strictEqual(json.error, "Invalid JSON body");
		});

		it("should reject non-array request body", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify({ command: "PING" }),
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 400);
			const json = await res.json();
			assert.strictEqual(
				json.error,
				"Request body must be an array of command and arguments",
			);
		});

		it("should reject empty command array", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify([]),
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 400);
			const json = await res.json();
			assert.strictEqual(json.error, "Command array cannot be empty");
		});
	});

	describe("POST / - Base64 encoding", () => {
		it("should encode strings recursively when requested", async () => {
			const originalCall = Redis.prototype.call;
			Redis.prototype.call = async () => ["20", ["hello", "OK", 42, null]];

			try {
				const app = createApp({ token: "test-token" });
				const req = new Request("http://localhost/", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer " + "test-token",
						"Upstash-Encoding": "base64",
					},
					body: JSON.stringify(["GET", "key"]),
				});

				const res = await app.fetch(req);
				assert.deepStrictEqual(await res.json(), {
					result: ["MjA=", ["aGVsbG8=", "OK", 42, null]],
				});
			} finally {
				Redis.prototype.call = originalCall;
			}
		});

		it("should leave strings unchanged when encoding is not requested", async () => {
			const originalCall = Redis.prototype.call;
			Redis.prototype.call = async () => "20";

			try {
				const app = createApp({ token: "test-token" });
				const req = new Request("http://localhost/", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer " + "test-token",
					},
					body: JSON.stringify(["GET", "key"]),
				});

				const res = await app.fetch(req);
				assert.deepStrictEqual(await res.json(), { result: "20" });
			} finally {
				Redis.prototype.call = originalCall;
			}
		});
	});

	describe("POST /pipeline - Pipeline validation", () => {
		it("should reject invalid JSON body", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/pipeline", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: "invalid json",
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 400);
			const json = await res.json();
			assert.strictEqual(json.error, "Invalid JSON body");
		});

		it("should reject non-array request body", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/pipeline", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify({ commands: [] }),
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 400);
			const json = await res.json();
			assert.strictEqual(json.error, "Request body must be an array of commands");
		});

		it("should reject empty pipeline", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/pipeline", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify([]),
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 400);
			const json = await res.json();
			assert.strictEqual(json.error, "Pipeline cannot be empty");
		});

		it("should reject pipeline with non-array command", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/pipeline", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify([["PING"], "invalid"]),
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 400);
			const json = await res.json();
			assert.strictEqual(json.error, "Command at index 1 must be an array");
		});

		it("should reject pipeline with empty command", async () => {
			const app = createApp({ token: "test-token" });

			const req = new Request("http://localhost/pipeline", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: "Bearer test-token",
				},
				body: JSON.stringify([["PING"], []]),
			});

			const res = await app.fetch(req);
			assert.strictEqual(res.status, 400);
			const json = await res.json();
			assert.strictEqual(json.error, "Command at index 1 cannot be empty");
		});
	});

	describe("POST /pipeline - Base64 encoding", () => {
		it("should encode successful results and preserve errors", async () => {
			const originalPipeline = Redis.prototype.pipeline;
			Redis.prototype.pipeline = () => ({
				call() {
					return this;
				},
				async exec() {
					return [
						[null, ["20", "OK", ["hello"]]],
						[new Error("failure"), null],
						[null, 42],
					];
				},
			});

			try {
				const app = createApp({ token: "test-token" });
				const req = new Request("http://localhost/pipeline", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer " + "test-token",
						"Upstash-Encoding": "base64",
					},
					body: JSON.stringify([["GET", "key"], ["GET", "other"]]),
				});

				const res = await app.fetch(req);
				assert.deepStrictEqual(await res.json(), [
					{ result: ["MjA=", "OK", ["aGVsbG8="]] },
					{ error: "failure" },
					{ result: 42 },
				]);

				const plainReq = new Request("http://localhost/pipeline", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						Authorization: "Bearer " + "test-token",
					},
					body: JSON.stringify([["GET", "key"], ["GET", "other"]]),
				});
				const plainRes = await app.fetch(plainReq);
				assert.deepStrictEqual(await plainRes.json(), [
					{ result: ["20", "OK", ["hello"]] },
					{ error: "failure" },
					{ result: 42 },
				]);
			} finally {
				Redis.prototype.pipeline = originalPipeline;
			}
		});
	});
});
