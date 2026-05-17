from app.services.retrieval_service import RetrievalService


def test_retrieval_service_returns_amsterdam_context() -> None:
    service = RetrievalService()

    context = service.get_context("Plan a slow cultural trip to Amsterdam")

    assert context["region"] == "Amsterdam"
    assert "Jordaan" in context["places"]


def test_retrieval_service_defaults_to_rocky_mountains_context() -> None:
    service = RetrievalService()

    context = service.get_context("Plan a scenic mountain photography trip")

    assert context["region"] == "Rocky Mountains"
    assert "Estes Park" in context["places"]

def test_retrieval_service_returns_grand_teton_context() -> None:
    service = RetrievalService()

    context = service.get_context("Plan a wildlife photography trip to Grand Teton")

    assert context["region"] == "Grand Teton National Park"
    assert "Jenny Lake" in context["places"]

