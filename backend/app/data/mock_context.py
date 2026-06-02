MOCK_TRAVEL_CONTEXT = {
    "rocky_mountains": {
        "region": "Rocky Mountains",
        "notes": [
            "Timed-entry reservations may be required for popular national park corridors.",
            "High-altitude weather can change quickly, even in summer.",
            "Short scenic walks near alpine lakes are useful for low-driving photography itineraries.",
            "Dark-sky opportunities improve when lodging is away from dense town centers.",
        ],
        "places": [
            "Estes Park",
            "Bear Lake",
            "Trail Ridge Road",
            "Moraine Park",
            "Lily Lake",
        ],
    },
    "amsterdam": {
        "region": "Amsterdam",
        "notes": [
            "Bike and tram logistics matter more than car routing in the city center.",
            "Museum reservations should be planned ahead during peak travel periods.",
            "Canal neighborhoods are strong for walking-heavy, low-car itineraries.",
        ],
        "places": [
            "Jordaan",
            "Rijksmuseum",
            "Vondelpark",
            "De Pijp",
            "Amsterdam Noord",
        ],
    },
    "grand_teton": {
        "region": "Grand Teton National Park",
        "notes": [
            "Wildlife viewing is best early in the morning or late in the evening.",
            "Be prepared for sudden weather changes, especially at higher elevations.",
            "Scenic drives can be combined with short hikes for a fuller experience.",
        ],
        "places": [
            "Jenny Lake",
            "Jackson Hole",
            "Teton Village",
            "Signal Mountain",
            "Oxbow Bend",
        ],
    },
    "alaska": {
        "region": "Alaska",
        "notes": [
            "Use fewer base towns for low-driving trips because distances are large.",
            "Coastal weather can be rainy and variable even in summer.",
            "Wildlife cruises and glacier viewpoints are strong photography anchors.",
        ],
        "places": [
            "Anchorage",
            "Girdwood",
            "Seward",
            "Kenai Fjords National Park",
            "Turnagain Arm",
            "Potter Marsh",
        ],
    },
}


def get_mock_context(query: str) -> dict:
    normalized_query = query.lower()
    if "amsterdam" in normalized_query:
        return MOCK_TRAVEL_CONTEXT["amsterdam"]
    elif "teton" in normalized_query:
        return MOCK_TRAVEL_CONTEXT["grand_teton"]
    elif "alaska" in normalized_query:
        return MOCK_TRAVEL_CONTEXT["alaska"]
    return MOCK_TRAVEL_CONTEXT["rocky_mountains"]
