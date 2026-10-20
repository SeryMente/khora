"""E72: single explicitly authorized fictional source, not personal ingestion.

No import-time I/O. Existing transactional writer and graph only. Hand-annotated
triples are identified honestly; this is NOT an extraction/fidelity accreditation.
Build writes require the exact source SHA opt-in. Runtime recovery is read-only
in Neo4j, limited to these four nodes, and never calls an embedding provider.
"""
from __future__ import annotations
import hashlib
import json
import os
import re

_STAGE = "initialization"
from datetime import datetime, timezone
import numpy as np
from khora_kernel import embeddings as em
from khora_kernel.api import Provenance, Triple

SOURCE = "Lumen es una baliza ficticia de color ámbar. Cobalto es un vehículo ficticio de color azul."
SOURCE_SHA = hashlib.sha256(SOURCE.encode()).hexdigest()
SCHEMA = "khora.ent01.public-fiction.e72.v1"
IO_ID = "ent01-public-fiction-e72-v1"
PREFIX = IO_ID + ":"
ITEMS = [("lumen", "Lumen (baliza ficticia)", SOURCE.split(". ")[0] + "."),
         ("ambar", "ámbar", SOURCE.split(". ")[0] + "."),
         ("cobalto", "Cobalto (vehículo ficticio)", SOURCE.split(". ")[1]),
         ("azul", "azul", SOURCE.split(". ")[1])]
IDS = [PREFIX + key for key, _, _ in ITEMS]
PAIRS = [(IDS[0], IDS[1]), (IDS[2], IDS[3])]


def _inspect(memory):
    # Aggregate only outside the approved IDs: no personal text leaves Neo4j.
    with memory._driver.session(default_access_mode="READ") as session:
        outside = session.run("""MATCH (n) WHERE n.invalid_at IS NULL
          AND any(l IN labels(n) WHERE l IN ['Entity','Literal','Blank'])
          AND NOT n:User AND NOT n:InformationObject AND NOT n:Community
          AND NOT coalesce(n.canonical_key,'') IN $ids RETURN count(n) AS n""", ids=IDS).single()["n"]
        sources = list(session.run("""MATCH (io:InformationObject)
          WHERE io.io_id=$io OR io.canonical_key=$key
          RETURN io.io_id AS id, io.sha256 AS sha, io.source_schema AS schema,
                 io.metadata_json AS metadata, io.invalid_at AS invalid""", io=IO_ID, key="io:"+IO_ID))
        nodes = [dict(r) for r in session.run("""MATCH (n)
          WHERE n.canonical_key IN $ids
          RETURN n.canonical_key AS id, labels(n) AS labels, n.label_original AS text,
                 n.description AS description, n.embedding AS embedding,
                 n.embedding_space_sha256 AS space, n.source_sha256 AS sha,
                 n.visibilidad AS visibility, n.invalid_at AS invalid""", ids=IDS)]
        edges = [dict(r) for r in session.run("""MATCH (a)-[r:RELATION]->(b)
          WHERE r.io_id=$io OR a.canonical_key IN $ids OR b.canonical_key IN $ids
          RETURN a.canonical_key AS a, b.canonical_key AS b, r.io_id AS io,
                 r.type AS relation, r.visibilidad AS visibility, r.invalid_at AS invalid""", io=IO_ID, ids=IDS)]
    if outside:
        raise RuntimeError("E72_SCOPE_CHANGED_NO_PERSONAL_INDEXING")
    if not sources:
        if nodes or edges:
            raise RuntimeError("E72_ID_COLLISION")
        return None
    if len(sources)!=1:
        raise RuntimeError("E72_SOURCE_COLLISION")
    source=dict(sources[0])
    if (source['id']!=IO_ID or source['sha']!=SOURCE_SHA or source['schema']!=SCHEMA
            or source['invalid'] is not None):
        raise RuntimeError("E72_SOURCE_COLLISION")
    metadata=json.loads(source['metadata'] or '{}')
    if metadata.get('original_text')!=SOURCE or metadata.get('authorization')!='E72':
        raise RuntimeError("E72_SOURCE_COLLISION")
    if sorted(n['id'] for n in nodes)!=sorted(IDS) or any(n['labels']!=['Entity'] or n['invalid'] is not None for n in nodes):
        raise RuntimeError("E72_NODE_SCOPE_INVALID")
    actual=sorted((e['a'],e['b'],e['io'],e['relation']) for e in edges)
    expected=sorted((a,b,IO_ID,'tiene_color') for a,b in PAIRS)
    if actual!=expected or any(e['invalid'] is not None for e in edges):
        raise RuntimeError("E72_EDGE_SCOPE_INVALID")
    return nodes, edges


def _embed_source_batch():
    """One genuine provider batch; bounded429 recovery, never hash fallback."""
    import time
    import urllib.error
    from khora_kernel.proveedores import ProveedorLLMGenerico
    em._embedding_space_id()
    provider=ProveedorLLMGenerico()
    for attempt in range(3):
        try:
            vectors=provider.incrustar([text for _,_,text in ITEMS])
            if len(vectors)!=4:
                raise RuntimeError('E72_PROVIDER_BATCH_INVALID')
            return [em._validated_semantic_vector(v) for v in vectors]
        except Exception as exc:
            cause=exc
            code=None
            for _ in range(5):
                if isinstance(cause,urllib.error.HTTPError):
                    code=cause.code
                    break
                cause=cause.__cause__ or cause.__context__
                if cause is None: break
            if code==429 and attempt<2:
                print('KHORA_E72_PROVIDER '+json.dumps({'http_status':429,'retry_seconds':65,'attempt':attempt+1}),flush=True)
                time.sleep(65)
                continue
            if isinstance(code,int) and 400<=code<=599:
                print('KHORA_E72_PROVIDER '+json.dumps({'http_status':code,'attempt':attempt+1}),flush=True)
            raise RuntimeError('E72_REAL_PROVIDER_BATCH_FAILED') from exc


def ingest_authorized(memory):
    global _STAGE
    _STAGE="scope_preflight"
    if os.getenv('KHORA_CHAT_E72_INGEST') != SOURCE_SHA:
        raise RuntimeError("E72_EXACT_AUTHORIZATION_REQUIRED")
    existing=_inspect(memory)
    created=existing is None
    with em.require_semantic_embeddings():
        space=em._embedding_space_id()
        if existing is None:
            # Validate real provider output BEFORE writing any graph data.
            _STAGE="real_provider_embedding"
            vectors=_embed_source_batch()
            now=datetime.now(timezone.utc).isoformat()
            provenance=Provenance(origen='E72:fuente-ficticia-autorizada:'+SOURCE_SHA,
                driver='anotacion-explicita-Samantha-no-extraccion-LLM',timestamp=now,
                event_time=now,capture_time=now,custody='prueba-publica-artificial-E72')
            triples=[Triple(id=IO_ID+':'+str(i),origen_id=a,destino_id=b,
                relacion='tiene_color',provenance=provenance,metadata={},
                valid_at=now,invalid_at=None,created_at=now) for i,(a,b) in enumerate(PAIRS)]
            entities,relations=memory._preparar_triples_para_asentamiento(triples,provenance)
            byid={e['canonical_key']:e for e in entities}
            for (key,label,_),vector in zip(ITEMS,vectors):
                byid[PREFIX+key].update(label_original=label,embedding=vector)
            _STAGE="existing_transactional_writer"
            memory.asentar_transaccional(entities,relations,{
                'origen':provenance.origen,'driver':provenance.driver,'version':1,
                'sha256':SOURCE_SHA,'source_schema':SCHEMA,
                'metadata':{'original_text':SOURCE,'authorization':'E72','fictional':True,
                            'annotation':'explicit_manual_not_llm_extraction'}},IO_ID,now)
            _STAGE="post_write_scope_verification"
            existing=_inspect(memory)
        # Idempotent resume/publication after a crash; unknown IDs/source never updated.
        nodes,_=existing
        rows=[]
        expected={PREFIX+k:(label,text) for k,label,text in ITEMS}
        for node in nodes:
            label,text=expected[node['id']]
            if node['text']!=label or node['visibility'] not in (None,'transparente'):
                raise RuntimeError('E72_NODE_COLLISION')
            vector=em._validated_semantic_vector(node['embedding'])
            if node['space'] not in (None,space) or node['sha'] not in (None,SOURCE_SHA):
                raise RuntimeError('E72_EMBEDDING_SPACE_CHANGED')
            rows.append({'id':node['id'],'description':text,'embedding':vector})
        _STAGE="bounded_publication"
        with memory._driver.session() as session:
            def publish(tx):
                row=tx.run("""MATCH (io:InformationObject {io_id:$io, sha256:$sha, source_schema:$schema})
                  UNWIND $rows AS row MATCH (io)-[:MENTIONS {io_id:$io}]->(n:Entity {canonical_key:row.id})
                  SET n.description=row.description,n.source_sha256=$sha,
                      n.embedding_space_sha256=$space,n.visibilidad='transparente'
                  RETURN count(n) AS n""",io=IO_ID,sha=SOURCE_SHA,schema=SCHEMA,rows=rows,space=space).single()
                if not row or row['n']!=4: raise RuntimeError('E72_PUBLICATION_SCOPE_INVALID')
                row=tx.run("""MATCH (a:Entity)-[r:RELATION {io_id:$io}]->(b:Entity)
                  WHERE a.canonical_key IN $ids AND b.canonical_key IN $ids
                  SET r.visibilidad='transparente',r.source_sha256=$sha RETURN count(r) AS n""",
                  io=IO_ID,ids=IDS,sha=SOURCE_SHA).single()
                if not row or row['n']!=2: raise RuntimeError('E72_PUBLICATION_SCOPE_INVALID')
            session.execute_write(publish)
        _STAGE="strict_index_sealing"
        result=ensure_index(memory)
    return {**result,'source_created':created,'source_sha256':SOURCE_SHA,
            'scope':'one_authorized_fictional_source','personal_notes_read':False}


def ensure_index(memory):
    inspected=_inspect(memory)
    if inspected is None: raise RuntimeError('E72_SOURCE_NOT_PRESENT')
    nodes,edges=inspected
    with em.require_semantic_embeddings():
        space=em._embedding_space_id()
        expected={PREFIX+k:(label,text) for k,label,text in ITEMS}
        vectors={}
        for node in nodes:
            label,text=expected[node['id']]
            if (node['text']!=label or node['description']!=text or node['sha']!=SOURCE_SHA
                    or node['space']!=space or node['visibility']!='transparente'):
                raise RuntimeError('E72_INDEX_PROVENANCE_INVALID')
            vectors[node['id']]=em._validated_semantic_vector(node['embedding'])
        if any(e['visibility']!='transparente' for e in edges):
            raise RuntimeError('E72_EDGE_NOT_PUBLIC')
        # Scope is verified empty apart from fixture, so this cannot read other text.
        revision=memory.get_graph_revision()
        matrix=np.asarray([vectors[i] for i in IDS],dtype=np.float32)
        texts={PREFIX+k:label+' '+text for k,label,text in ITEMS}
        em._save_index(matrix,IDS,revision,texts)
        meta=em._read_meta()
        if meta.get('graph_revision')!=revision or not meta.get('artifacts_sha256'):
            raise RuntimeError('E72_INDEX_SEAL_FAILED')
    return {'nodes_indexed':4,'relations':2,'dimension':em.EMBED_DIM,
            'graph_revision':revision,'graph_writes':False,'index_sealed':True}


def main():
    from khora_kernel.motor import Neo4jMemoriaOrganizada
    memory=None
    try:
        memory=Neo4jMemoriaOrganizada(os.environ['NEO4J_URI'],os.environ['NEO4J_USER'],os.environ['NEO4J_PASSWORD'])
        report=ingest_authorized(memory)
        print('KHORA_E72_FIXTURE '+json.dumps(report,sort_keys=True))
    except Exception as exc:
        # Enumerated codes only; never include free-form exception messages.
        safe={"verified":False,"error":"E72_BOUNDED_FIXTURE_FAILED","stage":_STAGE}
        if type(exc) in (RuntimeError,em.SemanticEmbeddingUnavailable) and re.fullmatch(r"(?:E72|EMBEDDING)_[A-Z_]+",str(exc)):
            safe['guard_code']=str(exc)
        cause=exc
        for _ in range(5):
            code=getattr(cause,'code',None)
            if isinstance(code,str) and re.fullmatch(r"Neo\.[A-Za-z.]+",code):
                safe['neo4j_code']=code
                break
            cause=cause.__cause__ or cause.__context__
            if cause is None: break
        safe['exception_class']=type(exc).__name__ if type(exc).__name__ in {'RuntimeError','Exception','ValueError','TypeError','KeyError','CypherSyntaxError','ClientError','ServiceUnavailable','SemanticEmbeddingUnavailable'} else 'RedactedError'
        print('KHORA_E72_FIXTURE '+json.dumps(safe,sort_keys=True))
        raise SystemExit(1) from None
    finally:
        if memory is not None: memory.cerrar()

if __name__=='__main__': main()
