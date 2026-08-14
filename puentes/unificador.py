# @l0 L0-002-R · @req ING-01/REQ-1,KA-00/REQ-2 · @acr ACR-1.1,ACR-1.2,ACR-2.1 · @ua RAKG/UA-19,RAKG/UA-20

class UnificadorAlLeer:
    def __init__(self, neo4j_driver):
        self.driver = neo4j_driver
        self.sinonimos_predicados = {
            "está_construida_sobre": "construida_sobre",
            "esta_construida_sobre": "construida_sobre"
        }

    def aplicar_puentes_a_fragmentos(self, fragmentos):
        return fragmentos

    def aplicar_puentes_a_subgrafo(self, subgrafo):
        """
        Recibe un subgrafo (diccionario con nodos y aristas) proveniente del retriever de la API,
        y le aplica las reglas de equivalencia deducidas por los puentes de consolidación.
        """
        if not self.driver:
            return subgrafo

        nodos = subgrafo.get("nodos", [])
        aristas = subgrafo.get("aristas", [])

        # Collect IDs present in the subgraph to only fetch relevant bridges
        subgrafo_ids = [n.get("id") for n in nodos]

        # Consultar puentes de equivalencia actuales del PKG (Nodos con ES_EQUIVALENTE_A)
        # Optimizamos para traer solo los puentes relevantes
        equivalencias = {}
        with self.driver.session() as session:
            # Traer los puentes conectados a cualquier nodo del subgrafo (directa o indirectamente)
            # Para simplificar y mantenerlo rápido sin queries recursivas complejas,
            # traemos puentes que involucren los nodos del subgrafo en 1-2 saltos.
            result = session.run("""
            MATCH (n1:Entity)-[:ES_EQUIVALENTE_A*1..2]-(n2:Entity)
            WHERE n1.canonical_key IN $nodos OR n2.canonical_key IN $nodos
            RETURN n1.canonical_key AS origen, n2.canonical_key AS destino
            """, nodos=subgrafo_ids)
            for record in result:
                equivalencias[record["origen"]] = record["destino"]
                equivalencias[record["destino"]] = record["origen"]

        # Union Find simple
        parent = {}
        def find(i):
            if parent[i] == i:
                return i
            parent[i] = find(parent[i])
            return parent[i]

        def union(i, j):
            root_i = find(i)
            root_j = find(j)
            if root_i != root_j:
                parent[root_i] = root_j

        # Inicializar
        for nid in set(equivalencias.keys()).union(set(equivalencias.values())):
            parent[nid] = nid

        for o, d in equivalencias.items():
            union(o, d)

        def get_root(node_id):
            if node_id in parent:
                return find(node_id)
            return node_id

        # Unificamos nodos
        nodos_unificados = {}
        for n in nodos:
            nid = n.get("id")
            root_id = get_root(nid)

            if root_id not in nodos_unificados:
                nodos_unificados[root_id] = {
                    "id": root_id,
                    "etiqueta": n.get("etiqueta", root_id),
                    "aliases": [nid] if nid != root_id else []
                }
            else:
                if nid != root_id and nid not in nodos_unificados[root_id]["aliases"]:
                    nodos_unificados[root_id]["aliases"].append(nid)

        # Re-escribir aristas
        aristas_unificadas = []
        aristas_vistas = set()

        for a in aristas:
            o_id = get_root(a.get("origen"))
            d_id = get_root(a.get("destino"))
            relacion_original = a.get("relacion", "")

            # Reconciliación de predicados sinónimos (R5)
            relacion_norm = relacion_original.lower().replace(" ", "_").strip()
            relacion = self.sinonimos_predicados.get(relacion_norm, relacion_original)

            if o_id != d_id:
                arista_key = (o_id, relacion, d_id)
                if arista_key not in aristas_vistas:
                    aristas_vistas.add(arista_key)
                    aristas_unificadas.append({
                        "origen": o_id,
                        "relacion": relacion,
                        "destino": d_id
                    })

        subgrafo_unificado = {
            "nodos": list(nodos_unificados.values()),
            "aristas": aristas_unificadas
        }

        return subgrafo_unificado
