import uuid

from datetime import datetime
from enum import Enum as PyEnum
from sqlalchemy import (
    Column, String, DateTime, Boolean, Numeric, ForeignKey, Integer,
    UniqueConstraint, Enum as SAEnum
)
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
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    document_type = Column(String(4), nullable=True)
    document_number = Column(String(32), nullable=True)
    rg = Column(String(32), nullable=True)
    phone = Column(String(32), nullable=True)
    birth_date = Column(DateTime, nullable=True)

    addr_street = Column(String(255), nullable=True)
    addr_number = Column(String(64), nullable=True)
    addr_complement = Column(String(255), nullable=True)
    addr_neighborhood = Column(String(120), nullable=True)
    addr_city = Column(String(120), nullable=True)
    addr_state = Column(String(2), nullable=True)
    addr_zip_code = Column(String(16), nullable=True)

    fundraisers = relationship("Fundraiser", back_populates="owner", cascade="all, delete-orphan")
    contributions = relationship("Contribution", back_populates="contributor")
    bank_accounts = relationship("BankAccount", back_populates="owner", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User {self.id} {self.email}>"

class FundraiserStatus(PyEnum):
    ACTIVE = "active"
    PAUSED = "paused"
    FINISHED = "finished"

class Fundraiser(db.Model):
    __tablename__ = "fundraisers"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
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
    contributor_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
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

class AccountType(PyEnum):
    CHECKING = "CHECKING"
    SAVINGS = "SAVINGS"

class BankAccount(db.Model):
    __tablename__ = "bank_accounts"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)

    bank_code = Column(String(10), nullable=False)
    bank_name = Column(String(255), nullable=True)
    agency = Column(String(32), nullable=False)
    account_number = Column(String(64), nullable=False)
    account_type = Column(SAEnum(AccountType, name="account_type"), nullable=False, default=AccountType.CHECKING)
    account_holder_name = Column(String(255), nullable=False)
    document_number = Column(String(32), nullable=False)

    is_default = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="bank_accounts")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "bank_code", "agency", "account_number", name="uq_account_unique_per_user"),
    )

    def __repr__(self) -> str:
        return f"<BankAccount {self.id} {self.bank_code}/{self.agency}/{self.account_number}>"
    
class EmailVerification(db.Model):
    __tablename__ = "email_verifications"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(120), nullable=False, index=True)
    name = Column(String(120), nullable=False)
    password_hash = Column(String(256), nullable=False)
    token = Column(String(128), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<EmailVerification {self.email} used={self.used}>"
    
class WithdrawalStatus(PyEnum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Withdrawal(db.Model):
    __tablename__ = "withdrawals"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    fundraiser_id = Column(UUID(as_uuid=True), ForeignKey("fundraisers.id"), nullable=False, index=True)
    bank_account_id = Column(UUID(as_uuid=True), ForeignKey("bank_accounts.id"), nullable=False, index=True)

    amount = Column(Numeric(scale=2), nullable=False)
    description = Column(String(512), nullable=True)

    status = Column(SAEnum(WithdrawalStatus, name="withdrawal_status"), nullable=False, default=WithdrawalStatus.PENDING)
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    processed_at = Column(DateTime, nullable=True)

    fundraiser = relationship("Fundraiser")
    bank_account = relationship("BankAccount")

    payout_token_hash = Column(String(64), nullable=True, index=True)
    payout_token_expires_at = Column(DateTime, nullable=True)
    payout_token_views = Column(Integer, default=0, nullable=False)
    payout_token_max_views = Column(Integer, default=3, nullable=False)

    def __repr__(self):
        return f"<Withdrawal {self.id} {self.amount} {self.status}>"
