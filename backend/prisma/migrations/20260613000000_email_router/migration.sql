-- Email Router: EmailConfig, EmailRule, EmailLog

CREATE TABLE "email_configs" (
  "id"                    TEXT NOT NULL,
  "company_id"            TEXT NOT NULL,
  "host"                  TEXT NOT NULL,
  "port"                  INTEGER NOT NULL DEFAULT 995,
  "username"              TEXT NOT NULL,
  "password"              TEXT NOT NULL,
  "use_tls"               BOOLEAN NOT NULL DEFAULT true,
  "poll_interval_minutes" INTEGER NOT NULL DEFAULT 5,
  "is_active"             BOOLEAN NOT NULL DEFAULT true,
  "last_polled_at"        TIMESTAMP(3),
  "created_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_configs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_configs_company_id_key" ON "email_configs"("company_id");

CREATE TABLE "email_rules" (
  "id"               TEXT NOT NULL,
  "company_id"       TEXT NOT NULL,
  "email_config_id"  TEXT NOT NULL,
  "name"             TEXT NOT NULL,
  "description"      TEXT NOT NULL,
  "assigned_user_id" TEXT NOT NULL,
  "priority"         TEXT NOT NULL DEFAULT 'MEDIUM',
  "is_active"        BOOLEAN NOT NULL DEFAULT true,
  "sort_order"       INTEGER NOT NULL DEFAULT 0,
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "email_logs" (
  "id"               TEXT NOT NULL,
  "company_id"       TEXT NOT NULL,
  "email_config_id"  TEXT NOT NULL,
  "message_uid"      TEXT NOT NULL,
  "subject"          TEXT,
  "from_address"     TEXT,
  "matched_rule_id"  TEXT,
  "task_id"          TEXT,
  "ai_reason"        TEXT,
  "status"           TEXT NOT NULL DEFAULT 'PROCESSED',
  "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_logs_email_config_id_message_uid_key"
  ON "email_logs"("email_config_id", "message_uid");

ALTER TABLE "email_configs"
  ADD CONSTRAINT "email_configs_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_rules"
  ADD CONSTRAINT "email_rules_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_rules"
  ADD CONSTRAINT "email_rules_email_config_id_fkey"
  FOREIGN KEY ("email_config_id") REFERENCES "email_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "email_rules"
  ADD CONSTRAINT "email_rules_assigned_user_id_fkey"
  FOREIGN KEY ("assigned_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_logs"
  ADD CONSTRAINT "email_logs_company_id_fkey"
  FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_logs"
  ADD CONSTRAINT "email_logs_email_config_id_fkey"
  FOREIGN KEY ("email_config_id") REFERENCES "email_configs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "email_logs"
  ADD CONSTRAINT "email_logs_matched_rule_id_fkey"
  FOREIGN KEY ("matched_rule_id") REFERENCES "email_rules"("id") ON DELETE SET NULL ON UPDATE CASCADE;
