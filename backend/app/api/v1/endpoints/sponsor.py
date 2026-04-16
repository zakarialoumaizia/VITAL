from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from app.api.deps import get_db, get_current_user
from app.models.user import User, ContactMessage, Sponsor
from app.models.event import Event

router = APIRouter(prefix="/sponsor", tags=["sponsor"])

class MessageCreate(BaseModel):
    subject: str
    content: str

@router.get("/dashboard")
def get_sponsor_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    # Allow admin or sponsor
    if current_user.user_role not in ["sponsor", "admin"]:
         raise HTTPException(status_code=403, detail="Only sponsors can access this dashboard")
         
    events = db.query(Event).order_by(Event.saved_at.desc()).limit(10).all()
    total_events = db.query(Event).count()
    
    return {
        "user": {
            "name": f"{current_user.first_name} {current_user.last_name}",
            "role": "Premium Sponsor"
        },
        "stats": {
            "total_events": total_events,
            "visibility_index": "85%",
            "partner_status": "Active"
        },
        "activity": [
            {
                "id": e.id,
                "title": e.topic,
                "type": e.event_type,
                "date": e.exact_date or "Upcoming",
                "impact": f"{e.participants} people reached"
            } for e in events
        ]
    }

@router.post("/message")
def send_message(
    msg: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    new_msg = ContactMessage(
        sender_id=current_user.id,
        subject=msg.subject,
        content=msg.content
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return {"status": "Message sent successfully", "id": new_msg.id}
