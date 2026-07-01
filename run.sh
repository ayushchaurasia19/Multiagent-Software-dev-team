#!/bin/bash
exec python -m uvicorn src.server:app --host 0.0.0.0 --port 8080
