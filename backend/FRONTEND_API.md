# Contrato de API para integración con frontend

Este documento es una guía de handoff para el equipo de frontend. No es código ejecutable ni reemplaza la lógica del frontend. Su objetivo es dejar claro qué endpoints existen, qué datos deben enviarse y qué respuesta devuelve el backend.

URL base:

```text
http://localhost:3000/api
```

---

## 1) Login

Ruta:

```http
POST /api/login
```

Headers:

```http
Content-Type: application/json
```

Body ejemplo:

```json
{
  "email": "admin@tuempresa.com",
  "password": "TuPasswordSegura123"
}
```

Respuesta exitosa ejemplo:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "role": "admin",
  "user": {
    "id": 1,
    "email": "admin@tuempresa.com",
    "nombre": "Admin",
    "departamento": "Finanzas",
    "roles": ["admin"]
  }
}
```

Errores posibles:

```json
{
  "message": "Credenciales inválidas"
}
```

```json
{
  "message": "Faltan email o password"
}
```

El frontend debe guardar el token recibido y enviarlo en cada petición protegida.

Ejemplo de header:

```http
Authorization: Bearer <token>
```

---

## 2) Obtener usuario autenticado

Ruta:

```http
GET /api/me
```

Headers:

```http
Authorization: Bearer <token>
```

Respuesta exitosa ejemplo:

```json
{
  "email": "admin@tuempresa.com",
  "role": "admin",
  "isAdmin": true,
  "filter": "Finanzas"
}
```

---

## 3) Subir archivos sin comparar

Ruta:

```http
POST /api/analysis/upload
```

Headers:

```http
Authorization: Bearer <token>
```

Body:

Usar `FormData` con exactamente dos archivos:

- `file1`
- `file2`

Respuesta exitosa ejemplo:

```json
{
  "success": true,
  "context": "upload",
  "message": "Archivos validados correctamente.",
  "files": {
    "file1": "archivo1.xlsx",
    "file2": "archivo2.xlsx",
    "xpmRows": 120,
    "xeroRows": 118
  }
}
```

Errores posibles:

```json
{
  "success": false,
  "code": "MISSING_FILES",
  "message": "Se requieren exactamente dos archivos: file1 y file2."
}
```

```json
{
  "success": false,
  "code": "EMPTY_XPM_FILE",
  "message": "El archivo XPM está vacío o no tiene un formato compatible."
}
```

Esta ruta solo valida y parsea los archivos. No ejecuta la comparación de negocio.

---

## 4) Comparar ambos archivos

Ruta:

```http
POST /api/analysis/compare
```

Headers:

```http
Authorization: Bearer <token>
```

Body:

Usar `FormData` con exactamente dos archivos:

- `file1`
- `file2`

Respuesta exitosa ejemplo:

```json
{
  "success": true,
  "context": "compare",
  "message": "Análisis realizado correctamente.",
  "resultado": [
    {
      "cliente": "Cliente A",
      "coincidencias": 12,
      "diferencias": 2
    }
  ]
}
```

Esta es la ruta principal para ejecutar la comparación del negocio.

---

## 5) Alias legacy por compatibilidad

Ruta:

```http
POST /api/upload-two
```

Tiene la misma protección con JWT y se usa para compatibilidad con versiones anteriores. En términos de negocio, ejecuta el mismo flujo de comparación.

---

## 6) Recomendaciones para el frontend

El frontend debe hacer lo siguiente:

1. Hacer login y guardar el JWT.
2. En cada petición protegida enviar el header:

```http
Authorization: Bearer <token>
```

3. Para upload y compare, usar `FormData` con `file1` y `file2`.
4. Manejar errores `401` y `403` como sesión expirada o sin permisos.
5. Mostrar la respuesta JSON del backend en la UI.

Ejemplo de fetch:

```js
const token = localStorage.getItem('token');

const formData = new FormData();
formData.append('file1', file1);
formData.append('file2', file2);

const response = await fetch('http://localhost:3000/api/analysis/compare', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`
  },
  body: formData
});

const data = await response.json();
console.log(data);
```

---

## 7) Rutas protegidas actualmente

Estas rutas requieren autenticación:

- `POST /api/analysis/upload`
- `POST /api/analysis/compare`
- `POST /api/upload-two`
- `GET /api/me`

La ruta de login sigue siendo pública.

---

## 8) Nota importante sobre expiración del token

La expiración actual del JWT sigue siendo de 1 hora. Esto quiere decir que el frontend debe volver a iniciar sesión cuando el token expire.

No se ha cambiado la política de expiración tal como quedó acordado.
