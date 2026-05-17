import os
from http import HTTPStatus
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory

try:
    from server.auth import get_jwt_secret, register_auth_routes
    from server.http_utils import json_error
    from server.learning import register_learning_routes
    from server.logging_utils import get_logger, log_call
    from server.schema import ensure_schema
except ImportError: 
    from auth import get_jwt_secret, register_auth_routes
    from http_utils import json_error
    from learning import register_learning_routes
    from logging_utils import get_logger, log_call
    from schema import ensure_schema


ROOT_DIR = Path(__file__).resolve().parent.parent
CLIENT_DIR = ROOT_DIR / "docs"
logger = get_logger("progtest.server")


@log_call(logger)
def create_app():
    load_dotenv(ROOT_DIR / ".env")
    get_jwt_secret()

    if os.environ.get("AUTO_INIT_SCHEMA", "1") == "1":
        ensure_schema()

    app = Flask(__name__)
    app.json.ensure_ascii = False

    @app.after_request
    @log_call(logger)
    def apply_default_headers(response):
        response.headers["Access-Control-Allow-Origin"] = os.environ.get("CORS_ALLOW_ORIGIN", "*")
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.route("/api", methods=["OPTIONS"])
    @app.route("/api/<path:_path>", methods=["OPTIONS"])
    @log_call(logger)
    def api_options(_path=None):
        return ("", HTTPStatus.NO_CONTENT)

    @app.get("/api/health")
    @app.get("/healthz")
    @log_call(logger)
    def healthcheck():
        return jsonify({"ok": True})

    register_auth_routes(app)
    register_learning_routes(app)

    @app.get("/")
    @log_call(logger)
    def serve_index():
        return send_from_directory(CLIENT_DIR, "index.html")

    @app.get("/<path:path>")
    @log_call(logger)
    def serve_static(path):
        if path.startswith("api/"):
            return json_error("Not found", HTTPStatus.NOT_FOUND)

        file_path = CLIENT_DIR / path
        if file_path.is_file():
            return send_from_directory(CLIENT_DIR, path)

        return send_from_directory(CLIENT_DIR, "index.html")

    @app.errorhandler(404)
    @log_call(logger)
    def handle_not_found(_error):
        if request.path.startswith("/api/"):
            return json_error("Not found", HTTPStatus.NOT_FOUND)
        return json_error("Not found", HTTPStatus.NOT_FOUND)

    return app


app = create_app()


@log_call(logger)
def run():
    port = int(os.environ.get("PORT", "8000"))
    app.run(host="0.0.0.0", port=port)


if __name__ == "__main__":
    run()
