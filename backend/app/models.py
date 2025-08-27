import uuid
from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import Column, String, DateTime, Boolean, Numeric, ForeignKey, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from .extensions import db

class User(db.Model):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(120), nullable=False)
    email = Column(String(120), nullable=False, unique=True, index=True)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    fundraisers = relationship("Fundraiser", back_populates="owner", cascade="all, delete-orphan")
    contributions = relationship("Contribution", back_populates="contributor")

    def __repr__(self) -> str:
        return f"<User {self.id} {self.email}>"

class FundraiserStatus(PyEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    FINISHED = "finished"

class Fundraiser(db.Model):
    __tablename__ = "fundraisers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)  # escopo
    title = Column(String(255), nullable=False)
    description = Column(String(1024), nullable=True)
    goal_amount = Column(Numeric(scale=2), nullable=False)
    current_amount = Column(Numeric(scale=2), nullable=False, default=0)
    status = Column(SAEnum(FundraiserStatus, name="fundraiser_status"), nullable=False, default=FundraiserStatus.ACTIVE)
    city = Column(String(120), nullable=True)
    state = Column(String(120), nullable=True)
    cover_image_url = Column(String(1024), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    public_slug = Column(String(255), unique=True, nullable=True)
    audit_token_hash = Column(String(512), nullable=True)
    audit_token_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="fundraisers")
    contributions = relationship("Contribution", back_populates="fundraiser")

    def __repr__(self) -> str:
        return f"<Fundraiser {self.id} {self.title}>"

class PaymentStatus(PyEnum):
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"

class Contribution(db.Model):
    __tablename__ = "contributions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    fundraiser_id = Column(UUID(as_uuid=True), ForeignKey("fundraisers.id"), nullable=False)
    contributor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)  # quem doou (pode ser nulo p/ anônimo)
    amount = Column(Numeric(scale=2), nullable=False)
    message = Column(String(512), nullable=True)
    is_anonymous = Column(Boolean, default=False, nullable=False)
    payment_status = Column(SAEnum(PaymentStatus, name="payment_status"), nullable=False, default=PaymentStatus.PENDING)
    payment_intent_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    fundraiser = relationship("Fundraiser", back_populates="contributions")
    contributor = relationship("User", back_populates="contributions")

    def __repr__(self) -> str:
        return f"<Contribution {self.id} {self.amount}>"
