from flask import request, jsonify, Blueprint
from werkzeug.exceptions import BadRequest, NotFound
from ..extensions import db
from ..models import Fundraiser, FundraiserReport

reports_bp = Blueprint("reports", __name__, url_prefix="/reports")

@reports_bp.post("/fundraisers")
def report_fundraiser():
    data = request.get_json(silent=True) or {}

    fundraiser_id = (data.get("fundraiser_id") or "").strip()
    reason = (data.get("reason") or "").strip().lower()
    message = (data.get("message") or "").strip()
    reporter_email = (data.get("reporter_email") or "").strip()

    if not fundraiser_id or not reason:
        raise BadRequest("fundraiser_id e reason são obrigatórios")

    f = Fundraiser.query.get(fundraiser_id)
    if not f or not f.is_public:
        raise NotFound("Arrecadação não encontrada")

    report = FundraiserReport(
        fundraiser_id=f.id,
        reporter_email=reporter_email or None,
        reason=reason[:64],
        message=message[:1024] if message else None,
    )
    db.session.add(report)
    db.session.commit()

    return jsonify({"status": "ok"}), 201

