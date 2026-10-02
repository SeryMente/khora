# @l0 L0-002-R · @req KA-00/REQ-2 · @acr ACR-2.1
def test_three_faculties_are_distinct():
    from khora_kernel.epistwin_audit import FacultySpec, validate_faculties
    result = validate_faculties([
        FacultySpec("SEA", ("sea",)),
        FacultySpec("IAR", ("iar",)),
        FacultySpec("RES", ("res",)),
    ])
    assert result["complete"] is True
    assert result["criteria_separated"] is True
