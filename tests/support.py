import sys
from types import ModuleType, SimpleNamespace


def install_dependency_stubs():
    if "flask" not in sys.modules:
        flask_module = ModuleType("flask")

        class DummyFlask:
            def __init__(self, *args, **kwargs):
                self.json = SimpleNamespace(ensure_ascii=False)

        flask_module.Flask = DummyFlask
        flask_module.jsonify = lambda payload=None, *args, **kwargs: payload
        flask_module.request = SimpleNamespace(
            get_json=lambda silent=True: None,
            headers={},
            args={},
            path="",
        )
        flask_module.send_from_directory = lambda *args, **kwargs: None
        sys.modules["flask"] = flask_module

    if "psycopg2" not in sys.modules:
        psycopg2_module = ModuleType("psycopg2")
        psycopg2_module.connect = lambda *args, **kwargs: None
        extras_module = ModuleType("psycopg2.extras")
        extras_module.RealDictCursor = object
        psycopg2_module.extras = extras_module
        sys.modules["psycopg2"] = psycopg2_module
        sys.modules["psycopg2.extras"] = extras_module

    if "bcrypt" not in sys.modules:
        bcrypt_module = ModuleType("bcrypt")
        bcrypt_module.hashpw = lambda password, salt: b"hash"
        bcrypt_module.gensalt = lambda: b"salt"
        bcrypt_module.checkpw = lambda password, password_hash: True
        sys.modules["bcrypt"] = bcrypt_module

    if "jwt" not in sys.modules:
        jwt_module = ModuleType("jwt")

        class ExpiredSignatureError(Exception):
            pass

        class InvalidTokenError(Exception):
            pass

        jwt_module.ExpiredSignatureError = ExpiredSignatureError
        jwt_module.InvalidTokenError = InvalidTokenError
        jwt_module.encode = lambda payload, secret, algorithm=None: payload
        jwt_module.decode = lambda token, secret, algorithms=None: token
        sys.modules["jwt"] = jwt_module
