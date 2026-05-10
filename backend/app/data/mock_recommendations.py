from app.schemas.common import BudgetLevel

MOCK_RECOMMENDATION_CARDS = [
    {
        "id": "northern-mn-aurora-weekend",
        "title": "3-Day Aurora Weekend in Northern Minnesota",
        "destination_region": "Northern Minnesota",
        "duration_days": 3,
        "short_description": "A short dark-sky escape with lake viewpoints, cozy base towns, and low-mileage nights for aurora watching.",
        "travel_styles": ["nature", "photography", "low-driving"],
        "budget_level": BudgetLevel.MEDIUM,
        "best_season": "Late fall through early spring",
        "preview_image_query": "northern minnesota aurora lake night sky",
    },
    {
        "id": "grand-teton-photo-road-trip",
        "title": "7-Day Grand Teton Photography Road Trip",
        "destination_region": "Grand Teton National Park",
        "duration_days": 7,
        "short_description": "A scenic photography-focused loop with sunrise viewpoints, wildlife windows, and flexible afternoon buffers.",
        "travel_styles": ["scenic", "photography", "wildlife"],
        "budget_level": BudgetLevel.MEDIUM,
        "best_season": "June through September",
        "preview_image_query": "grand teton sunrise photography snake river overlook",
    },
    {
        "id": "amsterdam-canal-culture",
        "title": "5-Day Amsterdam Canal and Culture Slow Trip",
        "destination_region": "Amsterdam",
        "duration_days": 5,
        "short_description": "A walkable city plan with canal neighborhoods, museums, cafes, and relaxed tram-friendly routing.",
        "travel_styles": ["culture", "food", "walkable"],
        "budget_level": BudgetLevel.MEDIUM,
        "best_season": "April through October",
        "preview_image_query": "amsterdam canals golden hour walking trip",
    },
]

