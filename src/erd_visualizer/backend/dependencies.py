from typing import Annotated

from databricks.sdk import WorkspaceClient
from fastapi import Depends, Header, Request

from .config import AppConfig
from .runtime import Runtime


def get_config(request: Request) -> AppConfig:
    """
    Returns the AppConfig instance from app.state.
    The config is initialized during application lifespan startup.
    """
    if not hasattr(request.app.state, "config"):
        raise RuntimeError(
            "AppConfig not initialized. "
            "Ensure app.state.config is set during application lifespan startup."
        )
    return request.app.state.config


ConfigDep = Annotated[AppConfig, Depends(get_config)]


def get_runtime(request: Request) -> Runtime:
    """
    Returns the Runtime instance from app.state.
    The runtime is initialized during application lifespan startup.
    """
    if not hasattr(request.app.state, "runtime"):
        raise RuntimeError(
            "Runtime not initialized. "
            "Ensure app.state.runtime is set during application lifespan startup."
        )
    return request.app.state.runtime


RuntimeDep = Annotated[Runtime, Depends(get_runtime)]


def get_obo_ws(
    token: Annotated[str | None, Header(alias="X-Forwarded-Access-Token")] = None,
    runtime: Runtime = Depends(get_runtime),
) -> WorkspaceClient:
    """
    Returns a Databricks Workspace client.
    - If the request has a valid X-Forwarded-Access-Token (when running as a Databricks App), uses that for OBO auth.
    - Otherwise (no token, empty, placeholder, or invalid), use runtime WorkspaceClient (e.g. local dev with databricks auth login).
    """
    t = (token or "").strip()
    # Ignore placeholders / invalid tokens (e.g. proxy sending "undefined" or "***") so local dev uses runtime.ws
    if not t or t in ("undefined", "null", "***", "*") or len(t) < 20:
        return runtime.ws
    try:
        return WorkspaceClient(token=t, auth_type="pat")
    except (ValueError, Exception):
        return runtime.ws
