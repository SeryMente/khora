# Bóveda portable — evidencia de interfaz, no protección productiva

Se comprobaron fuentes reales modificadas con React 19.1.0, lucide-react 1.26.0 y TypeScript 5.9.3. No se cambió package.json ni se introdujo criptografía propia.

## Ejecutado

- Tipos: PortableVaultView, página de Seguridad, registro de navegación y tipos/registro de revisión. Declaraciones aisladas para Next navigation y tres módulos no modificados; no es el typecheck completo.
- Cuatro pruebas `node:test` en `khora-web/tests/unit/portable_vault_ui.test.ts`: menú, componente único, escenarios/identificadores y ausencia de manejo de secretos/acciones ficticias.
- Navegador Chromium: escritorio 1440 y móvil 390, temas oscuro/claro, enlace directo, pestaña activa visible, flechas/Home, tarjeta de entrada, pestaña inválida, controles deshabilitados y sección de límites con teclado. Dos configuraciones adicionales de servicio no disponible. Sin errores JavaScript ni solicitudes externas.
- Tres capturas inspeccionadas individualmente: escritorio oscuro, móvil claro, fallo cerrado móvil. Los hashes están en evidence.json; imágenes entregadas en chat, no guardadas como binarios en Git.

## Reproducibilidad

`browser-qa.mjs` es arnés de investigación y espera un workspace aislado con `repo/khora-web` y `preview/` generado desde las fuentes cambiadas. No es comando de producto ni adaptador de autenticación. Sus módulos de navegación y paneles antiguos son sustituciones solo de prueba. Los archivos de preparación y las versiones se entregan junto con esta evidencia. La prueba de teclado espera el foco real antes de emitir la siguiente tecla; no confundir aria-selected con foco ya trasladado.

Desde un checkout completo, las pruebas nuevas se incorporan al runner unitario existente. Antes de merge: ejecutar typecheck completo, ui-review:check, ui:contract, suite unitaria y pruebas de navegador del producto sobre la configuración real de revisión; comprobar también acceso cerrado a revisión sin la variable habilitante. No se afirman aprobados en este entorno parcial.

## No verificado / no realizado

Ente Auth real, QR, llaves de cifrado, backend durable, cliente de bóveda, recuperación, Windows, corpus real, cuentas, despliegue y seguridad frente a un equipo comprometido. Registro y descarga permanecen inhabilitados. Sin merge ni publicación automática.
