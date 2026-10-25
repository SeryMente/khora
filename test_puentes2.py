import sys
import unittest

class FakeDriver:
    def session(self):
        return self

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def run(self, query, nodos=None):
        class Result:
            def __iter__(self):
                yield {"origen": "yo", "destino": "operador"}
                yield {"origen": "operador", "destino": "victor_hugo_torres"}
        return Result()

class TestPuentes2(unittest.TestCase):
    def test_unificador_r5(self):
        from puentes.unificador import UnificadorAlLeer
        driver = FakeDriver()
        u = UnificadorAlLeer(driver)

        subgrafo = {
            "nodos": [
                {"id": "khora", "etiqueta": "khora"},
                {"id": "neo4j", "etiqueta": "neo4j"}
            ],
            "aristas": [
                {"origen": "khora", "relacion": "está_construida_sobre", "destino": "neo4j"},
                {"origen": "khora", "relacion": "construida_sobre", "destino": "neo4j"},
            ]
        }

        unificado = u.aplicar_puentes_a_subgrafo(subgrafo)

        # Deben reconciliarse los predicados en uno solo
        self.assertEqual(len(unificado["aristas"]), 1)
        self.assertEqual(unificado["aristas"][0]["relacion"], "construida_sobre")

if __name__ == '__main__':
    unittest.main()
