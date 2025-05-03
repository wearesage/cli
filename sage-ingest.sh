#!/bin/bash

# sage-ingest.sh - A shortcut script for the sage ingest command
# Usage: sage-ingest.sh <codebase-id> [--skip-validation] [--no-cleanup]

# Check if codebase ID is provided
if [ -z "$1" ]; then
  echo "Error: Codebase ID is required"
  echo "Usage: sage-ingest.sh <codebase-id> [--skip-validation] [--no-cleanup]"
  exit 1
fi

# Pass all arguments to the sage ingest command
sage ingest "$@"