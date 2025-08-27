from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from structlog import get_logger

db = SQLAlchemy()
jwt = JWTManager()
cors = CORS()

logger = get_logger()