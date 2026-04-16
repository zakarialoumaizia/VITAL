from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_admin
from app.models.user import User, Member, Partner

router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/stats")
def get_admin_stats(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin)
):
    
    try:
        total_members = db.query(Member).count()
        total_partners = db.query(Partner).count()
        
        # Aggregate some mock activity data for the chart
        activity_data = [
            {"day": "M", "count": 12},
            {"day": "T", "count": 19},
            {"day": "W", "count": 15},
            {"day": "T", "count": 25},
            {"day": "F", "count": 22},
            {"day": "S", "count": 30},
        ]
        
        return {
            "total_members": total_members,
            "total_partners": total_partners,
            "active_events": 12, # Placeholder until events table is ready
            "growth": "+12%",
            "activity_chart": activity_data,
            "recent_messages": [
                {"id": 1, "name": "System", "msg": "Database sync complete", "time": "Just now"},
                {"id": 2, "name": "Security", "msg": "All systems operational", "time": "10m ago"},
            ]
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch stats: {str(e)}"
        )
