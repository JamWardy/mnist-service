def test_can_import_app():
    from api.main import app  # noqa: F401
    # Just importing without error is enough for a sanity check
