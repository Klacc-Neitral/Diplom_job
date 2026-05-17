from flask import jsonify, request

try:
    from server.logging_utils import get_logger, log_call
except ImportError:  # pragma: no cover - fallback for direct local execution
    from logging_utils import get_logger, log_call


logger = get_logger("progtest.server")


@log_call(logger)
def parse_json_body():
    payload = request.get_json(silent=True)
    if isinstance(payload, dict):
        return payload
    return {}


@log_call(logger)
def json_error(message, status):
    return jsonify({"error": message}), status
