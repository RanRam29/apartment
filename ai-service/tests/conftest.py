"""
Pre-mock motor.motor_asyncio before any test module imports it.
The motor package uses pyo3 Rust bindings that panic on this Python build.
Mocking at sys.modules level before collection prevents the ImportError.
"""
import sys
from unittest.mock import AsyncMock, MagicMock

_motor_client = MagicMock()
_motor_client.get_default_database.return_value = MagicMock()

_motor_asyncio = MagicMock()
_motor_asyncio.AsyncIOMotorClient.return_value = _motor_client

_motor_mock = MagicMock()
_motor_mock.motor_asyncio = _motor_asyncio

sys.modules.setdefault('motor', _motor_mock)
sys.modules.setdefault('motor.motor_asyncio', _motor_asyncio)
