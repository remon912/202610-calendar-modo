-- db/schema.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE workspaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(100) NOT NULL,
  owner_id    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspace_members (
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL,
  role         VARCHAR(10) NOT NULL CHECK (role IN ('owner','editor','viewer')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE workspace_invites (
  token        VARCHAR(64) PRIMARY KEY,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  role         VARCHAR(10) NOT NULL CHECK (role IN ('editor','viewer')),
  created_by   TEXT NOT NULL,
  expires_at   TIMESTAMPTZ NOT NULL
);

CREATE TABLE events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  track        VARCHAR(10) NOT NULL CHECK (track IN ('work','personal','coupon')),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE, -- work 트랙만 사용
  owner_id     TEXT NOT NULL,
  title        VARCHAR(200) NOT NULL,
  memo         TEXT,
  location     VARCHAR(200),
  assignee_id  TEXT,
  start_at     TIMESTAMPTZ NOT NULL,
  end_at       TIMESTAMPTZ NOT NULL,
  all_day      BOOLEAN NOT NULL DEFAULT false,
  timezone     VARCHAR(50) NOT NULL DEFAULT 'Asia/Seoul',
  rrule        TEXT,            -- 예: FREQ=WEEKLY;BYDAY=MO,WE;UNTIL=20261231T000000Z
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (end_at >= start_at),
  CHECK (track <> 'work' OR workspace_id IS NOT NULL)
);
CREATE INDEX idx_events_owner_range ON events (owner_id, start_at);
CREATE INDEX idx_events_ws_range    ON events (workspace_id, start_at);

CREATE TABLE event_exceptions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  original_start TIMESTAMPTZ NOT NULL,  -- 원래 회차의 시작 시각
  is_cancelled   BOOLEAN NOT NULL DEFAULT false,
  title          VARCHAR(200),
  start_at       TIMESTAMPTZ,
  end_at         TIMESTAMPTZ,
  UNIQUE (event_id, original_start)
);

CREATE TABLE todos (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id   TEXT NOT NULL,
  title      VARCHAR(200) NOT NULL,
  due_date   DATE,
  priority   SMALLINT NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
  done       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_todos_owner_due ON todos (owner_id, due_date);

CREATE TABLE reminders (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id       UUID REFERENCES events(id) ON DELETE CASCADE,
  todo_id        UUID REFERENCES todos(id) ON DELETE CASCADE,
  offset_minutes INTEGER NOT NULL CHECK (offset_minutes >= 0), -- 시작 n분 전
  CHECK ((event_id IS NULL) <> (todo_id IS NULL))
);

CREATE TABLE coupons (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id     UUID UNIQUE REFERENCES events(id) ON DELETE CASCADE,
  owner_id     TEXT NOT NULL,
  image_url    TEXT NOT NULL,
  brand        VARCHAR(100),
  product_name VARCHAR(200) NOT NULL,
  expires_on   DATE NOT NULL,
  barcode      VARCHAR(64),
  amount       INTEGER,
  status       VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired')),
  ai_result    JSONB,          -- Claude 원본 응답(재검토·품질 개선용)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_coupons_owner_exp ON coupons (owner_id, status, expires_on);

CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT NOT NULL,
  endpoint   TEXT NOT NULL UNIQUE,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notification_log (
  dedupe_key VARCHAR(200) PRIMARY KEY, -- 예: reminder:{id}:{occurrence}, coupon:{id}:D-3
  user_id    TEXT NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
