-- Create installed_apps table for app sync functionality
CREATE TABLE IF NOT EXISTS installed_apps (
    id SERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    package_name VARCHAR(255) NOT NULL,
    app_name VARCHAR(255),
    version_code INTEGER,
    version_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, package_name)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_installed_apps_device_id ON installed_apps(device_id);
CREATE INDEX IF NOT EXISTS idx_installed_apps_package_name ON installed_apps(package_name);

-- Url Blacklist table
CREATE TABLE IF NOT EXISTS url_blacklist (
    id SERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    url_pattern VARCHAR(500) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_url_blacklist_device_id ON url_blacklist(device_id);

-- Accessibility Services Table (stores available services per device)
CREATE TABLE IF NOT EXISTS accessibility_services (
    id SERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    service_id VARCHAR(500) NOT NULL, -- ComponentName.flattenToString()
    package_name VARCHAR(255) NOT NULL,
    service_name VARCHAR(255) NOT NULL,
    label VARCHAR(255),
    is_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, service_id)
);

-- Accessibility Policies Table (stores which services are locked)
CREATE TABLE IF NOT EXISTS accessibility_policies (
    id SERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    service_id VARCHAR(500) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    locked_by VARCHAR(255), -- admin username
    locked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, service_id)
);

-- Permission Status Table (tracks device permissions)
CREATE TABLE IF NOT EXISTS device_permissions (
    id SERIAL PRIMARY KEY,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    permission_name VARCHAR(255) NOT NULL,
    is_granted BOOLEAN DEFAULT FALSE,
    last_checked TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(device_id, permission_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_accessibility_services_device_id ON accessibility_services(device_id);
CREATE INDEX IF NOT EXISTS idx_accessibility_services_package ON accessibility_services(package_name);
CREATE INDEX IF NOT EXISTS idx_accessibility_policies_device_id ON accessibility_policies(device_id);
CREATE INDEX IF NOT EXISTS idx_device_permissions_device_id ON device_permissions(device_id);