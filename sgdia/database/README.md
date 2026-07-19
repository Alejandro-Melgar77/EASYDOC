# Infraestructura de datos EASYDOC

Esta carpeta contiene el entorno de datos local y los scripts de inicializacion.

## Compose recomendado para probar la aplicacion

Desde la raiz de `sgdia`, usar `docker compose up -d mongodb redis minio onlyoffice`.
El compose principal usa una instancia MongoDB y publica Redis en `6380` para poder
convivir con otros proyectos que ocupen `6379`. Los servicios se consumen desde el
backend en Docker mediante los nombres `mongodb`, `redis` y `minio`.

## Replica set opcional

`docker-compose.db.yml` levanta un replica set local de tres nodos para probar
transacciones y failover. Usa puertos alternativos (`27020-27022`, `6381` y
`9010-9011`) y no requiere un `mongo-keyfile` externo, que antes dejaba el entorno
incompleto en equipos nuevos.

```powershell
docker compose --env-file database/.env -f database/docker-compose.db.yml up -d
```

No se deben levantar ambos entornos de datos para la misma prueba. Elige el compose
principal para el flujo normal de EASYDOC y el compose alternativo únicamente para
validar comportamiento de replica set.

## Namespaces de Redis

- `sgdia:jwt_blacklist:<token>`: revocacion de JWT hasta su vencimiento.
- `sgdia:lockout:<email>` y `sgdia:login_attempts:<email>`: proteccion de login.
- `sgdia:cache:<recurso>:<id>`: cache de respuestas, TTL recomendado de 5 minutos.
- `sgdia:system_settings`: configuracion caliente del sistema.
- `notifications:<user_id>`: notificaciones pendientes, TTL recomendado de 30 dias.

## MinIO

El compose principal crea automaticamente `sgdia-documents`, `sgdia-exports`,
`sgdia-avatars` y `sgdia-temp`. La estructura de claves recomendada es:

`{org_id}/{module}/{year}/{month}/{file_id}`

La consola queda disponible en `http://localhost:9001` y la API S3 en
`http://localhost:9000`.
