-- DEVSPACE initial schema (MySQL 5.7+ / MariaDB 10.3+)

CREATE TABLE IF NOT EXISTS users (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    name VARCHAR(120) NOT NULL,
    email VARCHAR(190) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin','member') NOT NULL DEFAULT 'admin',
    title VARCHAR(120) NULL,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS settings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    `key` VARCHAR(64) NOT NULL,
    `value` TEXT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_settings_user_key (user_id, `key`),
    CONSTRAINT fk_settings_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS projects (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    url VARCHAR(255) NULL,
    repo_url VARCHAR(255) NULL,
    technologies VARCHAR(500) NULL,
    status ENUM('planning','active','paused','completed') NOT NULL DEFAULT 'planning',
    priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    start_date DATE NULL,
    deadline DATE NULL,
    color VARCHAR(7) NULL,
    notes MEDIUMTEXT NULL,
    archived_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_projects_user_status (user_id, status),
    KEY idx_projects_user_deadline (user_id, deadline),
    CONSTRAINT fk_projects_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tasks (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    project_id INT UNSIGNED NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    status ENUM('todo','in_progress','review','done') NOT NULL DEFAULT 'todo',
    priority ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
    category VARCHAR(60) NULL,
    due_date DATE NULL,
    due_time TIME NULL,
    position INT NOT NULL DEFAULT 0,
    completed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_tasks_user_status (user_id, status),
    KEY idx_tasks_user_due (user_id, due_date),
    KEY idx_tasks_user_completed (user_id, completed_at),
    KEY idx_tasks_project (project_id),
    CONSTRAINT fk_tasks_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_tasks_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS domains (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    project_id INT UNSIGNED NULL,
    name VARCHAR(253) NOT NULL,
    registrar VARCHAR(120) NULL,
    registered_at DATE NULL,
    expires_at DATE NULL,
    renewal_price DECIMAL(14,2) NULL,
    currency ENUM('UZS','USD','EUR') NOT NULL DEFAULT 'USD',
    dns_provider VARCHAR(120) NULL,
    ssl_expires_at DATE NULL,
    ssl_checked_at DATETIME NULL,
    auto_renew TINYINT(1) NOT NULL DEFAULT 0,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_domains_user_name (user_id, name),
    KEY idx_domains_user_expires (user_id, expires_at),
    KEY idx_domains_project (project_id),
    CONSTRAINT fk_domains_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_domains_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS servers (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    provider VARCHAR(120) NULL,
    ip_address VARCHAR(45) NULL,
    os VARCHAR(120) NULL,
    location VARCHAR(120) NULL,
    cpu VARCHAR(60) NULL,
    ram VARCHAR(60) NULL,
    storage VARCHAR(60) NULL,
    status ENUM('online','maintenance','offline') NOT NULL DEFAULT 'online',
    monthly_cost DECIMAL(14,2) NULL,
    currency ENUM('UZS','USD','EUR') NOT NULL DEFAULT 'USD',
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_servers_user_status (user_id, status),
    CONSTRAINT fk_servers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS server_projects (
    server_id INT UNSIGNED NOT NULL,
    project_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (server_id, project_id),
    KEY idx_server_projects_project (project_id),
    CONSTRAINT fk_sp_server FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE CASCADE,
    CONSTRAINT fk_sp_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS websites (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    project_id INT UNSIGNED NULL,
    server_id INT UNSIGNED NULL,
    name VARCHAR(120) NOT NULL,
    url VARCHAR(500) NOT NULL,
    method ENUM('GET','HEAD') NOT NULL DEFAULT 'GET',
    expected_status SMALLINT UNSIGNED NULL,
    check_interval SMALLINT UNSIGNED NOT NULL DEFAULT 5,
    timeout_seconds TINYINT UNSIGNED NOT NULL DEFAULT 10,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    last_state ENUM('up','down','unknown') NOT NULL DEFAULT 'unknown',
    last_status_code SMALLINT UNSIGNED NULL,
    last_response_ms INT UNSIGNED NULL,
    last_error VARCHAR(255) NULL,
    last_checked_at DATETIME NULL,
    next_check_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_websites_due (is_active, next_check_at),
    KEY idx_websites_user (user_id),
    CONSTRAINT fk_websites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_websites_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
    CONSTRAINT fk_websites_server FOREIGN KEY (server_id) REFERENCES servers (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_checks (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    website_id INT UNSIGNED NOT NULL,
    is_up TINYINT(1) NOT NULL,
    status_code SMALLINT UNSIGNED NULL,
    response_ms INT UNSIGNED NULL,
    error VARCHAR(255) NULL,
    checked_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    KEY idx_checks_website_time (website_id, checked_at),
    CONSTRAINT fk_checks_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS monitoring_incidents (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    website_id INT UNSIGNED NOT NULL,
    started_at DATETIME NOT NULL,
    resolved_at DATETIME NULL,
    status_code SMALLINT UNSIGNED NULL,
    error VARCHAR(255) NULL,
    PRIMARY KEY (id),
    KEY idx_incidents_website (website_id, started_at),
    KEY idx_incidents_open (resolved_at),
    CONSTRAINT fk_incidents_website FOREIGN KEY (website_id) REFERENCES websites (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS api_credentials (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    project_id INT UNSIGNED NULL,
    provider VARCHAR(120) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description TEXT NULL,
    secret_encrypted TEXT NOT NULL,
    secret_hint VARCHAR(8) NULL,
    expires_at DATE NULL,
    tags VARCHAR(255) NULL,
    last_revealed_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_credentials_user (user_id),
    KEY idx_credentials_project (project_id),
    CONSTRAINT fk_credentials_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_credentials_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expense_categories (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    name VARCHAR(60) NOT NULL,
    color VARCHAR(7) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_categories_user_name (user_id, name),
    CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS expenses (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    project_id INT UNSIGNED NULL,
    category_id INT UNSIGNED NULL,
    parent_id INT UNSIGNED NULL,
    title VARCHAR(160) NOT NULL,
    vendor VARCHAR(120) NULL,
    amount DECIMAL(16,2) NOT NULL,
    currency ENUM('UZS','USD','EUR') NOT NULL DEFAULT 'USD',
    spent_at DATE NOT NULL,
    is_recurring TINYINT(1) NOT NULL DEFAULT 0,
    recurrence ENUM('monthly','yearly') NULL,
    next_occurrence DATE NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_expenses_user_date (user_id, spent_at),
    KEY idx_expenses_project (project_id),
    KEY idx_expenses_category (category_id),
    KEY idx_expenses_recurring (is_recurring, next_occurrence),
    CONSTRAINT fk_expenses_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_expenses_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE SET NULL,
    CONSTRAINT fk_expenses_category FOREIGN KEY (category_id) REFERENCES expense_categories (id) ON DELETE SET NULL,
    CONSTRAINT fk_expenses_parent FOREIGN KEY (parent_id) REFERENCES expenses (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS code_snippets (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    title VARCHAR(160) NOT NULL,
    language VARCHAR(40) NOT NULL DEFAULT 'plaintext',
    category VARCHAR(60) NULL,
    tags VARCHAR(255) NULL,
    description TEXT NULL,
    code MEDIUMTEXT NOT NULL,
    is_favorite TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_snippets_user_lang (user_id, language),
    KEY idx_snippets_user_fav (user_id, is_favorite),
    CONSTRAINT fk_snippets_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NOT NULL,
    type VARCHAR(40) NOT NULL,
    level ENUM('info','success','warning','critical') NOT NULL DEFAULT 'info',
    title VARCHAR(200) NOT NULL,
    body VARCHAR(500) NULL,
    link VARCHAR(255) NULL,
    dedupe_key VARCHAR(190) NULL,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_notifications_dedupe (user_id, dedupe_key),
    KEY idx_notifications_user_read (user_id, read_at, created_at),
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS activity_logs (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    user_id INT UNSIGNED NULL,
    action VARCHAR(40) NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id INT UNSIGNED NULL,
    description VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_activity_user_time (user_id, created_at),
    KEY idx_activity_entity (entity_type, entity_id),
    CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rate_limits (
    `key` VARCHAR(191) NOT NULL,
    hits INT UNSIGNED NOT NULL DEFAULT 0,
    reset_at DATETIME NOT NULL,
    PRIMARY KEY (`key`),
    KEY idx_rate_limits_reset (reset_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
