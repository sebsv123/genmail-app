"""Pytest configuration."""

import os

# Ensure we use mock provider for tests
os.environ["LLM_PROVIDER"] = "mock"
