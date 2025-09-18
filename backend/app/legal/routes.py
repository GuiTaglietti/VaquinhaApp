import hashlib
from flask import Blueprint, request, jsonify, current_app, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from sqlalchemy import desc
from ..extensions import db
from ..models import LegalDoc, LegalAcceptance
from ..decorators import tenant_required

try:
    import bleach
    from markdown import markdown as md_to_html

except Exception:
    bleach = None
    md_to_html = None

legal_bp = Blueprint("legal", __name__)

ALLOWED_DOCS = {"privacy", "fees", "terms"}

def _sanitize_html(html: str) -> str:
    if not html:
        return ""
    if not bleach:
        return html
    return bleach.clean(
        html,
        tags=[
            "p","ul","ol","li","strong","em","b","i","u","a","h1","h2","h3","h4","h5","h6",
            "blockquote","code","pre","hr","br","span"
        ],
        attributes={"a": ["href", "title", "target", "rel"], "span": ["class"]},
        protocols=["http","https","mailto"],
        strip=True,
    )

def _render_and_sanitize(doc: LegalDoc) -> str:
    if doc.content_html:
        return _sanitize_html(doc.content_html)
    if md_to_html and doc.content_md:
        html = md_to_html(doc.content_md, extensions=["extra", "sane_lists", "admonition", "toc", "nl2br"])
        return _sanitize_html(html)
    return f"<pre>{(doc.content_md or '').replace('<','&lt;').replace('>','&gt;')}</pre>"

def _etag_for(doc: LegalDoc) -> str:
    payload = f"{doc.key}:{doc.locale}:{doc.version}:{doc.updated_at.isoformat()}:{hashlib.sha256((doc.content_html or doc.content_md or '').encode()).hexdigest()}"
    return hashlib.sha256(payload.encode()).hexdigest()

@legal_bp.get("/public/legal")
def get_legal_doc():
    key = (request.args.get("doc") or "").lower().strip()
    if key not in ALLOWED_DOCS:
        return jsonify({"error": "invalid_doc"}), 400

    locale = (request.args.get("lang") or "pt-BR").strip()

    q = (LegalDoc.query
         .filter(LegalDoc.key == key, LegalDoc.is_active == True)
         .filter(LegalDoc.locale == locale)
         .order_by(desc(LegalDoc.published_at), desc(LegalDoc.updated_at)))

    doc = q.first()
    if not doc and "-" in locale:
        prefix = locale.split("-", 1)[0]
        doc = (LegalDoc.query
               .filter(LegalDoc.key == key, LegalDoc.is_active == True, LegalDoc.locale.ilike(f"{prefix}%"))
               .order_by(desc(LegalDoc.published_at), desc(LegalDoc.updated_at))
               .first())
    if not doc:
        doc = (LegalDoc.query
               .filter(LegalDoc.key == key, LegalDoc.is_active == True)
               .order_by(desc(LegalDoc.published_at), desc(LegalDoc.updated_at))
               .first())

    if not doc:
        return jsonify({"error": "not_found"}), 404

    etag = _etag_for(doc)
    if request.headers.get("If-None-Match") == etag:
        return Response(status=304, headers={"ETag": etag, "Cache-Control": "public, max-age=3600"})

    html = _render_and_sanitize(doc)
    payload = {
        "key": doc.key,
        "title": doc.title,
        "version": doc.version,
        "updated_at": doc.updated_at.isoformat(),
        "content_html": html,
    }
    return jsonify(payload), 200, {
        "ETag": etag,
        "Cache-Control": "public, max-age=3600",
    }

@legal_bp.post("/legal/accept")
@jwt_required()
@tenant_required
def accept_legal_doc():
    data = request.get_json() or {}
    key = (data.get("doc_key") or "").lower().strip()
    version = (data.get("version") or "").strip()
    locale = (data.get("locale") or "pt-BR").strip()
    if key not in ALLOWED_DOCS or not version:
        return jsonify({"error": "invalid_request"}), 400

    user_id = get_jwt_identity()
    acc = LegalAcceptance(user_id=user_id, doc_key=key, version=version, locale=locale)
    db.session.add(acc)
    db.session.commit()
    return jsonify({"ok": True})
