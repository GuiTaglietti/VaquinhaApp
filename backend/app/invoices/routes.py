from flask import jsonify, Blueprint, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..extensions import db
from ..decorators import tenant_required
from ..models import Invoice, User, Fundraiser
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.units import mm
from decimal import Decimal

invoices_bp = Blueprint("invoices", __name__)

@invoices_bp.get("/invoices")
@jwt_required()
@tenant_required
def list_invoices():
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "not_found", "message": "Usuário não encontrado"}), 404

    q = (
        db.session.query(Invoice)
        .join(Invoice.fundraiser)
        .filter_by(owner_user_id=user.id)
        .order_by(Invoice.issued_at.desc())
    )
    items = [inv.to_dict() for inv in q.all()]
    return jsonify(items), 200

@invoices_bp.get("/invoices/<uuid>/download")
@jwt_required()
@tenant_required
def download_invoice(uuid):
    user_id = get_jwt_identity()

    inv = (
        db.session.query(Invoice)
        .join(Invoice.fundraiser)
        .filter(
            Invoice.id == uuid,
            Fundraiser.owner_user_id == user_id,
        )
        .first()
    )
    if not inv:
        return jsonify({"error": "not_found", "message": "Nota não encontrada"}), 404

    fundraiser_title = getattr(inv.fundraiser, "title", "") or "-"
    issued_at = getattr(inv, "issued_at", None)
    issued_txt = issued_at.strftime("%d/%m/%Y %H:%M") if issued_at else "-"
    amount = Decimal(getattr(inv, "amount", 0) or 0)
    tax_amount = Decimal(getattr(inv, "tax_amount", 0) or 0)
    net = amount - tax_amount

    buf = BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    w, h = A4
    y = h - 30 * mm

    def line(txt, size=11, bold=False):
        nonlocal y
        c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
        c.drawString(25 * mm, y, str(txt))
        y -= 7 * mm

    c.setTitle(f"Nota Fiscal {inv.id}")

    line("Velório Solidário — Nota Fiscal (serviços)", 14, bold=True)
    line(f"Número: {inv.id}", 10)
    line(f"Emissão: {issued_txt} (UTC)", 10)

    y -= 3 * mm
    line("Dados da Campanha", 12, bold=True)
    line(f"Título: {fundraiser_title}", 10)

    y -= 3 * mm
    line("Valores", 12, bold=True)
    line(f"Valor Bruto (R$): {amount:.2f}", 11)
    line(f"Taxas/Impostos (R$): {tax_amount:.2f}", 11)
    line(f"Valor Líquido (R$): {net:.2f}", 12, bold=True)

    c.showPage()
    c.save()
    buf.seek(0)

    filename = f"nota_fiscal_{inv.id}.pdf"
    resp = send_file(
        buf,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
        max_age=0,
        conditional=False,
        etag=False,
        last_modified=None,
    )

    resp.headers["Cache-Control"] = "no-store"
    return resp

