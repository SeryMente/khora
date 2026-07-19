# pyright: reportUnknownMemberType=false, reportUnknownVariableType=false, reportUnknownArgumentType=false, reportInvalidTypeArguments=false, reportUnknownParameterType=false, reportMissingTypeArgument=false, reportMissingParameterType=false, reportDeprecated=false, reportUnusedImport=false
import sqlite3
import typing
from pathlib import Path

from khora_kernel.api import (
    AristaSubgrafo,
    ContextoDeVisibilidad,
    EntidadIngresada,
    MotorDeConsulta,
    NivelSuficiencia,
    NodoSubgrafo,
    Provenance,
    ResultadoDeConsulta,
    SubgrafoRelevante,
)

# @req: khora.consulta.sqlite_vec
# @req: khora.consulta.embeddings

class RetrieverGraphRAG(MotorDeConsulta):
    def __init__(self, corpus_path: Path):
        self.corpus_path = corpus_path
        # Degradación declarada: sin dependencias externas (sqlite-vec)
        # en kernel, usamos keyword matching sobre sqlite básico si existe.
        self._inicializar_bd()

    def _inicializar_bd(self) -> None:
        # Mock de estructura local
        db_path = self.corpus_path / "corpus.db"
        self.corpus_path.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(db_path) as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS fragmentos (
                    id TEXT PRIMARY KEY,
                    texto TEXT,
                    origen TEXT,
                    timestamp TEXT,
                    visibilidad TEXT
                )
                """
            )
            # Para test: insertaremos manualmente en test o si no lo simulamos.

    def consultar(
        self,
        pregunta: str,
        contexto: ContextoDeVisibilidad,
    ) -> ResultadoDeConsulta:
        db_path = self.corpus_path / "corpus.db"
        if not db_path.exists():
            return self._retornar_insuficiente()

        fragmentos = []
        with sqlite3.connect(db_path) as conn:
            cursor = conn.cursor()
            # Búsqueda degradada por keywords (simulando knn local)
            keywords = pregunta.lower().split()

            # Construir query dinámica para keyword matching simple
            if keywords:
                condiciones_like = " OR ".join(["texto LIKE ?" for _ in keywords])
                parametros: typing.List[typing.Any] = [f"%{kw}%" for kw in keywords]

                query = f"SELECT id, texto, origen, timestamp, visibilidad FROM fragmentos WHERE ({condiciones_like})"

                if contexto == ContextoDeVisibilidad.TRANSPARENTE:
                    query += " AND visibilidad = ?"
                    parametros.append(ContextoDeVisibilidad.TRANSPARENTE.value)

                cursor.execute(query, parametros)
                filas = cursor.fetchall()
            else:
                filas = []

            for fila in filas:
                # fila: id, texto, origen, timestamp, visibilidad
                vis_db = ContextoDeVisibilidad(fila[4])
                # Doble validación en memoria por seguridad
                if contexto == ContextoDeVisibilidad.TRANSPARENTE and vis_db == ContextoDeVisibilidad.PRIVADO:
                    continue

                fragmentos.append(
                    EntidadIngresada(
                        id=fila[0],
                        texto=fila[1],
                        provenance=Provenance(
                            origen=fila[2],
                            driver=None,
                            timestamp=fila[3]
                        ),
                        visibilidad=vis_db,
                    )
                )

        if not fragmentos:
            return self._retornar_insuficiente()

        # Simular subgrafo topológico (1 salto) basado en entidades de la pregunta.
        # Como no hay modelo de entidades real ni GraphRAG completo indexado,
        # retornamos un subgrafo dummy vinculado a los fragmentos encontrados.
        nodos = []
        aristas = []
        for i, frag in enumerate(fragmentos):
            nodo_id = f"nodo_{frag.id}"
            nodos.append(NodoSubgrafo(id=nodo_id, etiqueta="Fragmento"))
            if i > 0:
                aristas.append(AristaSubgrafo(origen=f"nodo_{fragmentos[i-1].id}", destino=nodo_id, relacion="relacionado_con"))

        return ResultadoDeConsulta(
            fragmentos=fragmentos,
            subgrafo=SubgrafoRelevante(nodos=nodos, aristas=aristas),
            suficiencia=NivelSuficiencia.SUFICIENTE,
            resumenes_incluidos=False, # Degradación: resúmenes/comunidades pendientes (D2)
        )

    def _retornar_insuficiente(self) -> ResultadoDeConsulta:
        return ResultadoDeConsulta(
            fragmentos=[],
            subgrafo=SubgrafoRelevante(),
            suficiencia=NivelSuficiencia.INSUFICIENTE,
            resumenes_incluidos=False,
        )
