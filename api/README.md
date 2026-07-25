# Khora API

This directory contains the FastAPI application that serves as a bridge between the Khora kernel and external clients. It is designed to be deployed on Render.

## Environment Variables

The following environment variables are required for the application to function correctly:

* `NEO4J_URI`: URI for the Neo4j database (e.g., `neo4j://localhost:7687`).
* `NEO4J_USER`: Username for the Neo4j database.
* `NEO4J_PASSWORD`: Password for the Neo4j database.
* `LLM_CHEAP_API_URL`: Base URL for the OpenAI-compatible API.
* `LLM_CHEAP_API_KEY`: API key for the LLM service.
* `LLM_CHEAP_MODEL`: Model identifier for the LLM service.
* `KHORA_API_KEY`: Secret key required to authenticate requests to the API. Clients must provide this in the `X-KHORA-KEY` header.
* `KHORA_WEB_ORIGIN`: Allowed origin for CORS (e.g., `https://khora.app`).
