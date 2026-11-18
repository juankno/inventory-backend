-- La foto para pantalla completa pasa a ser la original (".full.jpg"): la de 400 px
-- se veía borrosa. Se corrigen las respuestas ya guardadas, también las que no tenían
-- foto grande. Solo cambian datos: el esquema sigue igual.
UPDATE "catalog_entries"
SET "image_large_url" = regexp_replace("image_url", '\.200\.jpg$', '.full.jpg')
WHERE "image_url" ~ '\.200\.jpg$';
