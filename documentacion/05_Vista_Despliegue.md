# Vista de Despliegue (Física PUDS)

La Vista de Despliegue muestra la topología del hardware y el software en el que se ejecuta el sistema. Mapea los componentes de software (Vista de Implementación) a nodos de hardware físico o virtual (Contenedores/Nube).

## 1. Diagrama de Despliegue en AWS (Producción)

El sistema SGDIA está diseñado para desplegarse en Amazon Web Services utilizando contenedores ECS/Fargate para alta disponibilidad.

```mermaid
architecture-beta
    group vpc(cloud)[VPC AWS - Región us-east-1]
    
    group pub_subnet(subnet)[Subred Pública] in vpc
    service alb(server)[Application Load Balancer] in pub_subnet
    
    group priv_subnet(subnet)[Subred Privada] in vpc
    service api(server)[ECS: Contenedores FastAPI] in priv_subnet
    service worker(server)[ECS: Celery Workers] in priv_subnet
    service broker(server)[ElastiCache Redis] in priv_subnet
    
    group data_tier(database)[Capa de Datos Persistente]
    service mongo(database)[MongoDB Atlas Cluster] 
    service s3(server)[AWS S3 Buckets]
    
    service user_web(internet)[Navegador Web (Angular)]
    service user_mov(internet)[App Móvil (Flutter)]
    service onlyoffice(server)[Instancia EC2 ONLYOFFICE] in priv_subnet

    user_web:R --> L:alb
    user_mov:R --> L:alb
    
    alb:B --> T:api
    alb:R --> L:onlyoffice
    
    api:R --> L:broker
    api:B --> T:worker
    
    api:R --> L:mongo
    worker:R --> L:mongo
    
    api:R --> L:s3
    worker:R --> L:s3
```
*(Nota: El diagrama anterior utiliza la sintaxis architecture-beta de Mermaid para representar topologías en la nube)*

## 2. Descripción de los Nodos

*   **Nodo Cliente:** Dispositivos (Laptops, Smartphones) ejecutando el motor V8 de Chrome o el binario compilado de Flutter.
*   **ALB (Load Balancer):** Balanceador de carga L7 que distribuye el tráfico HTTPS y gestiona la terminación SSL. Mantiene persistencia de sesión para los WebSockets.
*   **Contenedores ECS (FastAPI):** Nodos sin estado (stateless) auto-escalables que procesan peticiones REST y mantienen conexiones WS.
*   **Contenedores ECS (Workers Celery):** Nodos dedicados al cómputo asíncrono (Extracción de texto PDF, OCR, Machine Learning).
*   **ElastiCache (Redis):** Actúa como Broker de mensajes (pub/sub) para Celery y como caché de alta velocidad para rate limiting.
*   **MongoDB Atlas:** Cluster distribuido en la nube, gestionado (DBaaS), que almacena las colecciones de base de datos e índices HNSW (Vector Search).
*   **Amazon S3:** Almacenamiento de objetos que provee durabilidad 99.999999999% para archivos pesados.
