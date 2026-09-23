CREATE DATABASE IF NOT EXISTS optimum;

USE optimum;

-- Roles Table
CREATE TABLE Roles (
    role_id INT PRIMARY KEY AUTO_INCREMENT,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NULL
);

-- put the roles in our database
INSERT INTO Roles (role_name, description) VALUES 
('Admin', 'Administrator with full system access'),
('Optimizer', 'Regular user who can create projects and models,upload data, run optimizations and see the results ');

-- Users Table
CREATE TABLE Users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    surname VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL DEFAULT 2,
    status VARCHAR(50) NOT NULL DEFAULT 'Active',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_users_role
        FOREIGN KEY (role_id)
        REFERENCES Roles(role_id)
        ON UPDATE CASCADE
);

-- Sessions Table
CREATE TABLE Sessions (
    session_id VARCHAR(255) PRIMARY KEY,
    user_id INT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_sessions_user
        FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);
-- Projects Table
CREATE TABLE Projects (
    project_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    project_name VARCHAR(150) NOT NULL,
    description TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_projects_user
        FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

-- Models Table
CREATE TABLE Models (
    model_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    model_name VARCHAR(150) NOT NULL,
    objective_type VARCHAR(50) NOT NULL,
    total_budget DECIMAL(15,2) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_models_project
        FOREIGN KEY (project_id)
        REFERENCES Projects(project_id)
        ON DELETE CASCADE
);
-- Model Assets Table
CREATE TABLE Model_Assets (
    asset_id INT PRIMARY KEY AUTO_INCREMENT,
    model_id INT NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    expected_return DECIMAL(8,4) NOT NULL,
    risk_score DECIMAL(8,4) NOT NULL,
    min_allocation DECIMAL(15,2) NOT NULL,
    max_allocation DECIMAL(15,2) NOT NULL,

    CONSTRAINT fk_model_assets_model
        FOREIGN KEY (model_id)
        REFERENCES Models(model_id)
        ON DELETE CASCADE
);
-- Model Constraints Table
CREATE TABLE Model_Constraints (
    constraint_id INT PRIMARY KEY AUTO_INCREMENT,
    model_id INT NOT NULL,
    constraint_type VARCHAR(100) NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    operator VARCHAR(10) NOT NULL,

    CONSTRAINT fk_model_constraints_model
        FOREIGN KEY (model_id)
        REFERENCES Models(model_id)
        ON DELETE CASCADE
);