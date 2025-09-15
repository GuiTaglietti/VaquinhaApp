# app/uploads/routes.py
import os
import imghdr
import secrets
from datetime import datetime
from pathlib import Path
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

uploads_bp = Blueprint("uploads", __name__, url_prefix="/api/uploads")

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_FILE_SIZE_MB = 5

def _allowed_ext(filename: str) -> bool:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    return ext in ALLOWED_EXTENSIONS

def _validate_image_signature(path: Path) -> bool:
    # Proteção básica contra uploads não-imagem (checa assinatura)
    kind = imghdr.what(path)
    return kind in {"jpeg", "png", "gif", "webp"}

def _ensure_upload_dir() -> Path:
    base = current_app.config.get("UPLOAD_DIR", "/app/uploads")
    Path(base).mkdir(parents=True, exist_ok=True)
    return Path(base)

@uploads_bp.route("/image", methods=["POST"])
@jwt_required()
def upload_image():
    """
    Recebe multipart/form-data com campo 'file'.
    Retorna JSON: { url, filename, size_bytes }
    """
    if "file" not in request.files:
        return jsonify({"error": "Arquivo não enviado"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "Nenhum arquivo selecionado"}), 400

    if not _allowed_ext(file.filename):
        return jsonify({"error": "Extensão não permitida"}), 400

    # Limite de tamanho (server-side): se tiver Content-Length, checa rápido
    content_length = request.content_length or 0
    if content_length and content_length > MAX_FILE_SIZE_MB * 1024 * 1024:
        return jsonify({"error": f"Tamanho máximo de {MAX_FILE_SIZE_MB}MB excedido"}), 413

    # Gera nome seguro e único
    original = secure_filename(file.filename)
    rand = secrets.token_urlsafe(8)
    stamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    ext = original.rsplit(".", 1)[-1].lower()
    safe_name = f"{stamp}_{rand}.{ext}"

    upload_dir = _ensure_upload_dir()
    full_path = upload_dir / safe_name
    file.save(full_path)

    # Valida assinatura de imagem
    if not _validate_image_signature(full_path):
        try:
            full_path.unlink(missing_ok=True)
        except Exception:
            pass
        return jsonify({"error": "Arquivo inválido (não é uma imagem)"}), 400

    # Monta URL pública
    public_base = current_app.config.get("UPLOAD_PUBLIC_BASE", "/files")
    url = f"{public_base}/{safe_name}"

    return jsonify({
        "url": url,
        "filename": safe_name,
        "size_bytes": full_path.stat().st_size
    }), 201

# Servir os arquivos (se estiver hospedando estático pelo próprio backend)
@uploads_bp.route("/file/<path:filename>", methods=["GET"])
def serve_by_blueprint(filename):
    # Rota alternativa: /api/uploads/file/<filename>
    upload_dir = _ensure_upload_dir()
    return send_from_directory(upload_dir, filename)
