-- Los "no encontrado" guardados se buscaron solo en Open Food Facts. Ahora también se
-- consulta Open Beauty Facts, así que se borran para que se vuelvan a buscar. Es solo
-- la tabla de respuestas guardadas: no hay datos de ningún negocio.
DELETE FROM "catalog_entries" WHERE "name" IS NULL;
