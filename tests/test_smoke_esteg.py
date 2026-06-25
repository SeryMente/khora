def test_import():
    import comind.blackbox
    import comind.esteg

    assert comind.blackbox is not None
    assert comind.esteg is not None
