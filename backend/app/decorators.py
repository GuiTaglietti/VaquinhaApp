from functools import wraps
from flask import jsonify, g
from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
import uuid

def tenant_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        g.user_id = uuid.UUID(str(get_jwt_identity()))
        g.tenant_id = g.user_id
        return fn(*args, **kwargs)
    return wrapper


