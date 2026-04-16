from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.event import Event

router = APIRouter(prefix="/member", tags=["member"])

@router.get("/dashboard")
def get_member_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    
    try:
        # Fetch actual events from DB
        events = db.query(Event).all()
        
        # Structure data for the frontend
        # Categorize events by type
        workshops = []
        conferences = []
        hackathons = []
        
        for e in events:
            ev_data = {
                "id": e.id,
                "topic": e.topic,
                "event_type": e.event_type,
                "participants": e.participants,
                "month": e.recommended_month,
                "budget": e.estimated_budget,
                "venue": e.venue,
                "exact_date": e.exact_date
            }
            tp = (e.event_type or "").lower()
            if tp == "workshop":
                workshops.append(ev_data)
            elif tp == "conference":
                conferences.append(ev_data)
            elif tp == "hackathon":
                hackathons.append(ev_data)
        
        return {
            "user": {
                "first_name": current_user.first_name,
                "last_name": current_user.last_name,
                "email": current_user.email,
                "date_of_birth": current_user.date_of_birth.isoformat() if current_user.date_of_birth else None,
            },
            "stats": {
                "energy": "1.2k", # Placeholder for now
                "activity": "8hr", # Placeholder for now
            },
            "programs": {
                "workshops": workshops,
                "conferences": conferences,
                "hackathons": hackathons
            },
            "featured_program": hackathons[0] if hackathons else (workshops[0] if workshops else None)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard data: {str(e)}"
        )
