"""Isolated guard tests; not deployed acceptance evidence."""
import copy
from unittest.mock import MagicMock
import pytest
from api import chat_public_fixture as f


def approved_rows():
    return [dict(id=f.PREFIX+k,labels=['Entity'],text=label,description=text,
                 embedding=[1.0]*1024,space='space',sha=f.SOURCE_SHA,
                 visibility='transparente',invalid=None) for k,label,text in f.ITEMS]


def test_exact_authorization_required(monkeypatch):
    monkeypatch.delenv('KHORA_CHAT_E72_INGEST',raising=False)
    memory=MagicMock()
    with pytest.raises(RuntimeError,match='EXACT_AUTHORIZATION'):
        f.ingest_authorized(memory)
    memory._driver.session.assert_not_called()


def test_runtime_recovers_only_validated_vectors_without_provider(monkeypatch,tmp_path):
    rows=approved_rows();edges=[dict(visibility='transparente')]*2
    monkeypatch.setattr(f,'_inspect',lambda m:(rows,edges))
    monkeypatch.setattr(f.em,'_embedding_space_id',lambda:'space')
    for key,name in [('INDEX_FILE','v.idx'),('MAP_FILE','ids.json'),('META_FILE','meta.json'),('TEXT_FILE','texts.json')]:
        monkeypatch.setattr(f.em,key,tmp_path/name)
    embed=MagicMock(side_effect=AssertionError('NO_PROVIDER_ON_RESTART'))
    monkeypatch.setattr(f.em,'embed_text',embed)
    memory=MagicMock();memory.get_graph_revision.return_value='revision'
    report=f.ensure_index(memory)
    assert report['nodes_indexed']==4 and report['index_sealed']
    assert f.em._read_ids()==f.IDS
    assert f.em._read_meta()['embedding_space_sha256']=='space'
    embed.assert_not_called()
    memory._driver.session.assert_not_called()


@pytest.mark.parametrize('field,value',[('sha','foreign'),('space','foreign'),('visibility','privado'),('description','foreign')])
def test_restart_rejects_mixed_provenance(monkeypatch,field,value):
    rows=approved_rows();rows[0][field]=value
    monkeypatch.setattr(f,'_inspect',lambda m:(rows,[dict(visibility='transparente')]*2))
    monkeypatch.setattr(f.em,'_embedding_space_id',lambda:'space')
    with pytest.raises(RuntimeError,match='INDEX_PROVENANCE'):
        f.ensure_index(MagicMock())


def test_scope_probe_rejects_other_semantic_data_without_reading_text():
    memory=MagicMock();session=memory._driver.session.return_value.__enter__.return_value
    session.run.return_value.single.return_value={'n':1}
    session.run.return_value.__iter__.return_value=iter([])
    with pytest.raises(RuntimeError,match='SCOPE_CHANGED'):
        f._inspect(memory)
    query=session.run.call_args_list[0].args[0]
    assert 'RETURN count(n)' in query
    assert 'label_original' not in query


def test_empty_scope_never_creates_index(monkeypatch):
    monkeypatch.setattr(f,'_inspect',lambda m:None)
    with pytest.raises(RuntimeError,match='SOURCE_NOT_PRESENT'):
        f.ensure_index(MagicMock())


def test_collision_checked_before_any_provider_call(monkeypatch):
    monkeypatch.setenv('KHORA_CHAT_E72_INGEST',f.SOURCE_SHA)
    monkeypatch.setattr(f,'_inspect',MagicMock(side_effect=RuntimeError('E72_ID_COLLISION')))
    embed=MagicMock();monkeypatch.setattr(f.em,'embed_text',embed)
    with pytest.raises(RuntimeError,match='COLLISION'):
        f.ingest_authorized(MagicMock())
    embed.assert_not_called()
