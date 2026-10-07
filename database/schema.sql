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


-- Portfolio Data Upload 
CREATE TABLE IF NOT EXISTS Datasets (
    dataset_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    row_count INT NOT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_datasets_project
        FOREIGN KEY (project_id)
        REFERENCES Projects(project_id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS Portfolio_Rows (
    row_id INT PRIMARY KEY AUTO_INCREMENT,
    dataset_id INT NOT NULL,
    ticker_or_asset VARCHAR(50) NOT NULL,
    historical_return DECIMAL(8,4) NOT NULL,
    volatility DECIMAL(8,4) NOT NULL,

    CONSTRAINT fk_portfolio_rows_dataset
        FOREIGN KEY (dataset_id)
        REFERENCES Datasets(dataset_id)
        ON DELETE CASCADE
);

-- Optimization Runs Table /space for  multiple solver engines
CREATE TABLE IF NOT EXISTS Optimization_Runs (
    run_id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    model_id INT NOT NULL,
    solver_name VARCHAR(50) NOT NULL DEFAULT 'HiGHS', -- space  for future solvers
    
    status ENUM(
        'Pending',
        'Running',
        'Completed',
        'Failed'
    ) NOT NULL DEFAULT 'Pending',

    objective_value DECIMAL(18,6) NULL,
    total_allocated DECIMAL(15,2) NULL,
    total_return DECIMAL(18,6) NULL,
    total_risk DECIMAL(18,6) NULL,

    error_message TEXT NULL,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at DATETIME NULL,
    completed_at DATETIME NULL,

    CONSTRAINT fk_runs_project
        FOREIGN KEY (project_id)
        REFERENCES Projects(project_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_runs_model
        FOREIGN KEY (model_id)
        REFERENCES Models(model_id)
        ON DELETE CASCADE
);

--  Normalized Optimization Results :Asset-level performance contributions
CREATE TABLE IF NOT EXISTS Optimization_Results (
    result_id INT PRIMARY KEY AUTO_INCREMENT,
    run_id INT NOT NULL,
    asset_id INT NOT NULL,

    allocation_amount DECIMAL(15,2) NOT NULL,
    allocation_percent DECIMAL(8,4) NOT NULL,

    expected_return_contribution DECIMAL(18,6) NOT NULL,
    risk_contribution DECIMAL(18,6) NOT NULL,

    CONSTRAINT fk_results_run
        FOREIGN KEY (run_id)
        REFERENCES Optimization_Runs(run_id)
        ON DELETE CASCADE,

    CONSTRAINT fk_results_asset
        FOREIGN KEY (asset_id)
        REFERENCES Model_Assets(asset_id)
        ON DELETE CASCADE
);

--  Asset Allocations Summary Table
CREATE TABLE IF NOT EXISTS Asset_Allocations (
    allocation_id INT PRIMARY KEY AUTO_INCREMENT,
    run_id INT NOT NULL,
    asset_name VARCHAR(100) NOT NULL,
    allocated_amount DECIMAL(15,2) NOT NULL,
    allocation_percentage DECIMAL(5,2) NOT NULL,

    CONSTRAINT fk_alloc_run
        FOREIGN KEY (run_id)
        REFERENCES Optimization_Runs(run_id)
        ON DELETE CASCADE
);

-- Constraint Satisfaction Checklist Table
CREATE TABLE IF NOT EXISTS Run_Constraint_Results (
    id INT PRIMARY KEY AUTO_INCREMENT,
    run_id INT NOT NULL,
    label VARCHAR(150) NOT NULL,
    operator VARCHAR(10) NOT NULL,
    target_value DECIMAL(15,4) NOT NULL,
    actual_value DECIMAL(15,4) NOT NULL,
    satisfied TINYINT(1) NOT NULL,

    CONSTRAINT fk_cres_run
        FOREIGN KEY (run_id)
        REFERENCES Optimization_Runs(run_id)
        ON DELETE CASCADE
);