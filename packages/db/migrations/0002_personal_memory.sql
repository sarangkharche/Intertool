CREATE TABLE IF NOT EXISTS personal_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_kind TEXT NOT NULL,
  source_key TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  source_modified_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  search_vector TSVECTOR NOT NULL DEFAULT ''::tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, source_kind, source_key)
);

CREATE INDEX IF NOT EXISTS personal_memories_user_created_idx
  ON personal_memories (user_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION intertool_personal_memories_search_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.source_key, '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS personal_memories_search_update ON personal_memories;
CREATE TRIGGER personal_memories_search_update
BEFORE INSERT OR UPDATE OF title, content, source_key ON personal_memories
FOR EACH ROW EXECUTE FUNCTION intertool_personal_memories_search_update();

CREATE INDEX IF NOT EXISTS personal_memories_search_idx
  ON personal_memories USING GIN (search_vector);
