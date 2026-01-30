# Upstash Redis Server

by [Nicholas C. Zakas](https://humanwhocodes.com)

If you find this useful, please consider supporting my work with a [donation](https://humanwhocodes.com/donate).

## Description

An HTTP server that emulates the Upstash Redis API to interact with an existing Redis database running locally. Built with [Hono](https://hono.dev/), this server accepts HTTP requests with Redis commands and forwards them to a local Redis instance.

The intended use is for local development and testing when you want to use the Upstash Redis REST API format with a local Redis server.

## Installation

```shell
npm install @humanwhocodes/upstash-redis-server
```

## Usage

### Starting the Server

You can start the server using `npx`:

```shell
npx @humanwhocodes/upstash-redis-server
```

### Configuration

The server is configured using environment variables:

- **URS_TOKEN** (required) - The expected Bearer token in the Authorization header for authentication
- **PORT** (optional) - The port to start the server on (default: 8080)
- **REDIS_URL** (optional) - The Redis connection URL (default: redis://localhost:6379)

Example:

```shell
URS_TOKEN=my-secret-token \
PORT=3000 \
REDIS_URL=redis://localhost:6379 \
npx @humanwhocodes/upstash-redis-server
```

### Making Requests

The server supports the Upstash Redis REST API format for executing Redis commands.

#### Single Command Execution

Send a POST request to the root endpoint (`/`) with:

- **Authorization header**: `Bearer <URS_TOKEN>` (required)
- **Request body**: JSON array with command and arguments

Example using curl:

```shell
curl -X POST http://localhost:8080/ \
  -H "Authorization: Bearer my-secret-token" \
  -H "Content-Type: application/json" \
  -d '["GET", "mykey"]'
```

Response:

```json
{
  "result": "myvalue"
}
```

#### Pipeline Execution

Send a POST request to the `/pipeline` endpoint with:

- **Authorization header**: `Bearer <URS_TOKEN>` (required)
- **Request body**: JSON array of command arrays

Example using curl:

```shell
curl -X POST http://localhost:8080/pipeline \
  -H "Authorization: Bearer my-secret-token" \
  -H "Content-Type: application/json" \
  -d '[["SET", "key", "value"], ["GET", "key"], ["DEL", "key"]]'
```

Response:

```json
[
  { "result": "OK" },
  { "result": "value" },
  { "result": 1 }
]
```

### Programmatic Usage

You can also use this package programmatically:

```javascript
import { createApp } from "@humanwhocodes/upstash-redis-server";

const app = createApp({
  token: "my-secret-token",
  redisUrl: "redis://localhost:6379"
});

// Use with your preferred Node.js server adapter
```

## Use with Docker

The easiest way to run the proxy server is with Docker. You can effectively mimic and Upstash Redis server by using a Redis container alongside this package:

```yaml
services:
  redis:
    image: redis:latest
    container_name: redis
    expose:
      - "6379"
  
  proxy:
    image: node:22-slim
    container_name: redis-proxy
    working_dir: /app
    ports:
      - "3030:3030"
    environment:
      - URS_TOKEN=my-secret-token
      - PORT=3030
      - REDIS_URL=redis://redis:6379
    command: npx @humanwhocodes/upstash-redis-server@1
    depends_on:
      - redis

volumes:
  redis-insight-data:
```

## License

Copyright 2025 Nicholas C. Zakas

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
