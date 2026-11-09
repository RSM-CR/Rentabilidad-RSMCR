# Diagrama actualizado de la base de datos

Este diagrama refleja la estructura que realmente está alineada con el backend actual del proyecto.

## Modelo actual

- `usuarios` almacena la información principal del usuario.
- `role` almacena los roles disponibles del sistema.
- `user_role` relaciona usuarios con roles.
- La autenticación y autorización actuales se basan en roles, no en privilegios detallados.

## Diagrama

```text
+---------------------+        +---------------------+        +---------------------+
| usuarios            |        | user_role           |        | role                |
+---------------------+        +---------------------+        +---------------------+
| user_id (PK)        |<----->| user_id (FK)        |        | role_id (PK)        |
| nombre              |        | role_id (FK)        |<----->| nombre              |
| email               |        +---------------------+        +---------------------+
| password            |
| fecha_creacion      |
| ultimo_login        |
| puesto              |
| departamento        |
+---------------------+
```

## Relaciones

- Un usuario puede tener muchos roles en `user_role`.
- Un rol puede estar asignado a muchos usuarios.
- La autenticación verifica el email y la contraseña del usuario.
- Luego revisa los roles asociados para decidir si el usuario es administrador o no.

## Observación importante

La parte de `privilege` y `role_privilege` del diagrama original no aparece implementada en el backend actual. Eso significa que, en el estado actual del proyecto, la autorización se maneja principalmente por roles y no por privilegios granulares.

## Representación en texto simple

```text
usuarios 1 --- N user_role N --- 1 role
```

Esto es lo que más se ajusta al flujo actual del sistema de autenticación y autorización.
