from sqlalchemy import Column, String, Integer, Float, DateTime, Text
from app.models.user import Base
from datetime import datetime

class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, index=True)
    saved_at = Column(DateTime, default=datetime.utcnow)
    session_id = Column(String)
    event_type = Column(String)
    topic = Column(String, nullable=True)
    participants = Column(Integer)
    preferred_month = Column(Integer, nullable=True)
    user_budget = Column(Float, nullable=True)
    recommended_month = Column(String, nullable=True)
    estimated_budget = Column(Float)
    confidence = Column(String)
    segment = Column(String)
    top_risk = Column(Text, nullable=True)
    budget_guard = Column(Text, nullable=True)
    venue = Column(String, nullable=True)
    venue_capacity = Column(Integer, nullable=True)
    exact_date = Column(String, nullable=True)
