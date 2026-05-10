from enum import StrEnum


class BudgetLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    LUXURY = "luxury"


class SegmentType(StrEnum):
    ARRIVAL = "arrival"
    DRIVE = "drive"
    ACTIVITY = "activity"
    MEAL = "meal"
    LODGING = "lodging"
    VIEWPOINT = "viewpoint"
    FLIGHT = "flight"
    TRANSIT = "transit"
    BUFFER = "buffer"
    DEPARTURE = "departure"

