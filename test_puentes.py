import unittest

class FakeDriver:
    def session(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def run(self, query):
        class Result:
            def __iter__(self):
                yield {"origen": "yo", "destino": "operador"}
                yield {"origen": "operador", "destino": "victor_hugo_torres"}
        return Result()

class TestPuentes(unittest.TestCase):
    def test_unificador(self):
        from puentes.unificador import UnificadorAlLeer
        driver = FakeDriver()
        u = UnificadorAlLeer(driver)

        subgrafo = {
            "nodos": [
                {"id": "yo", "etiqueta": "yo"},
                {"id": "operador", "etiqueta": "operador"},
                {"id": "victor_hugo_torres", "etiqueta": "victor_hugo_torres"},
                {"id": "khora", "etiqueta": "khora"},
                {"id": "neo4j", "etiqueta": "neo4j"}
            ],
            "aristas": [
                {"origen": "yo", "relacion": "ES", "destino": "khora"},
                {"origen": "victor_hugo_torres", "relacion": "CREO", "destino": "khora"},
                {"origen": "khora", "relacion": "CONSTRUIDA_SOBRE", "destino": "neo4j"}
            ]
        }

        unificado = u.aplicar_puentes_a_subgrafo(subgrafo)

        # 'yo', 'operador', 'victor_hugo_torres' deben colapsar en uno solo
        self.assertEqual(len(unificado["nodos"]), 3) # khora, neo4j, y (yo/operador/victor)

        # Verificar aristas
        self.assertEqual(len(unificado["aristas"]), 3)

if __name__ == '__main__':
    unittest.main()
