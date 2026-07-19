// init-mongo.js — Inicialización de la base de datos sgdia_dev
// Este script se ejecuta automáticamente en el contenedor mongo1

db = db.getSiblingDB("sgdia_dev");

// Crear usuario de desarrollo con acceso restringido
db.createUser({
  user: "sgdia_dev_user",
  pwd: process.env.MONGO_DEV_PASSWORD || "dev_password",
  roles: [
    { role: "readWrite", db: "sgdia_dev" },
    { role: "dbAdmin",   db: "sgdia_dev" }
  ]
});

print("✅ Base de datos sgdia_dev inicializada correctamente");
print("✅ Usuario sgdia_dev_user creado");
