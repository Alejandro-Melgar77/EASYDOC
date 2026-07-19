import pytest
from app.models.audit_log import AuditLog
from app.models.document import Document
from app.models.folder import Folder
from app.models.policy import Policy
from app.models.role import Action, ModulePermission
from app.models.user import User


def test_user_normalizes_email_and_name():
    assert User.email_lowercase("  Persona@Example.COM ") == "persona@example.com"
    assert User.name_must_have_two_chars("  Persona Demo  ") == "Persona Demo"


def test_user_rejects_short_name():
    with pytest.raises(ValueError):
        User.name_must_have_two_chars("A")


def test_role_permission_accepts_typed_actions():
    permission = ModulePermission(module="workflows", actions=[Action.READ, Action.APPROVE])

    assert permission.actions == [Action.READ, Action.APPROVE]


def test_audit_log_declares_two_year_ttl():
    ttl_indexes = [
        index for index in AuditLog.Settings.indexes if index.document.get("name") == "ttl_2_years"
    ]

    assert ttl_indexes
    assert ttl_indexes[0].document["expireAfterSeconds"] == 63_072_000


def test_document_and_policy_validate_embedding_dimensions():
    vector = [0.0] * 1536

    assert Document.embedding_must_have_1536_dimensions(vector) == vector
    assert Policy.embedding_must_have_1536_dimensions(vector) == vector
    with pytest.raises(ValueError):
        Document.embedding_must_have_1536_dimensions([0.0])
    with pytest.raises(ValueError):
        Policy.embedding_must_have_1536_dimensions([0.0])


def test_folder_rejects_path_separators():
    with pytest.raises(ValueError):
        Folder.name_no_slash("documentos/secretaria")
