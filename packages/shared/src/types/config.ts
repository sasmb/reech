/**
 * Configuration Types
 * 
 * TypeScript type definitions for configuration-related structures.
 */

// ============================================================================
// APPLICATION CONFIGURATION TYPES
// ============================================================================

/**
 * Application configuration structure
 */
export interface AppConfig {
  name: string;
  version: string;
  description: string;
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
  port: number;
  host: string;
  baseUrl: string;
  apiUrl: string;
  webUrl: string;
}

/**
 * Database configuration structure
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  username: string;
  password: string;
  ssl: boolean;
  pool: {
    min: number;
    max: number;
    idle: number;
  };
  migrations: {
    directory: string;
    table: string;
  };
}

/**
 * Redis configuration structure
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
  ttl: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number;
}

/**
 * Authentication configuration structure
 */
export interface AuthConfig {
  jwt: {
    secret: string;
    expiresIn: string;
    refreshExpiresIn: string;
    algorithm: string;
  };
  bcrypt: {
    rounds: number;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'strict' | 'lax' | 'none';
  };
  oauth: {
    google?: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    github?: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
    facebook?: {
      clientId: string;
      clientSecret: string;
      redirectUri: string;
    };
  };
}

/**
 * Email configuration structure
 */
export interface EmailConfig {
  provider: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  from: {
    name: string;
    email: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  ses?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
  };
  mailgun?: {
    apiKey: string;
    domain: string;
  };
}

/**
 * File storage configuration structure
 */
export interface StorageConfig {
  provider: 'local' | 's3' | 'gcs' | 'azure';
  local?: {
    directory: string;
    baseUrl: string;
  };
  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    baseUrl: string;
  };
  gcs?: {
    projectId: string;
    keyFilename: string;
    bucket: string;
    baseUrl: string;
  };
  azure?: {
    connectionString: string;
    container: string;
    baseUrl: string;
  };
}

/**
 * Payment configuration structure
 */
export interface PaymentConfig {
  stripe?: {
    publishableKey: string;
    secretKey: string;
    webhookSecret: string;
    apiVersion: string;
  };
  paypal?: {
    clientId: string;
    clientSecret: string;
    environment: 'sandbox' | 'live';
    webhookId: string;
  };
  square?: {
    applicationId: string;
    accessToken: string;
    environment: 'sandbox' | 'production';
    webhookSignatureKey: string;
  };
}

/**
 * Analytics configuration structure
 */
export interface AnalyticsConfig {
  googleAnalytics?: {
    measurementId: string;
    apiSecret: string;
  };
  mixpanel?: {
    projectToken: string;
    apiSecret: string;
  };
  amplitude?: {
    apiKey: string;
    apiSecret: string;
  };
  posthog?: {
    apiKey: string;
    host: string;
  };
}

/**
 * Monitoring configuration structure
 */
export interface MonitoringConfig {
  sentry?: {
    dsn: string;
    environment: string;
    tracesSampleRate: number;
  };
  datadog?: {
    apiKey: string;
    service: string;
    environment: string;
  };
  newrelic?: {
    licenseKey: string;
    appName: string;
    environment: string;
  };
  logs: {
    level: 'error' | 'warn' | 'info' | 'debug';
    format: 'json' | 'simple';
    destination: 'console' | 'file' | 'remote';
    file?: {
      path: string;
      maxSize: string;
      maxFiles: number;
    };
    remote?: {
      endpoint: string;
      apiKey: string;
    };
  };
}

/**
 * Rate limiting configuration structure
 */
export interface RateLimitConfig {
  global: {
    windowMs: number;
    max: number;
    message: string;
  };
  api: {
    windowMs: number;
    max: number;
    message: string;
  };
  auth: {
    windowMs: number;
    max: number;
    message: string;
  };
  upload: {
    windowMs: number;
    max: number;
    message: string;
  };
}

/**
 * Security configuration structure
 */
export interface SecurityConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods: string[];
    allowedHeaders: string[];
  };
  helmet: {
    contentSecurityPolicy: boolean;
    crossOriginEmbedderPolicy: boolean;
    crossOriginOpenerPolicy: boolean;
    crossOriginResourcePolicy: boolean;
    dnsPrefetchControl: boolean;
    frameguard: boolean;
    hidePoweredBy: boolean;
    hsts: boolean;
    ieNoOpen: boolean;
    noSniff: boolean;
    originAgentCluster: boolean;
    permittedCrossDomainPolicies: boolean;
    referrerPolicy: boolean;
    xssFilter: boolean;
  };
  csrf: {
    enabled: boolean;
    secret: string;
    cookie: {
      name: string;
      secure: boolean;
      sameSite: 'strict' | 'lax' | 'none';
    };
  };
}

/**
 * Feature flags configuration structure
 */
export interface FeatureFlagsConfig {
  checkout: boolean;
  inventory: boolean;
  analytics: boolean;
  multiLanguage: boolean;
  darkMode: boolean;
  socialLogin: boolean;
  wishlist: boolean;
  reviews: boolean;
  recommendations: boolean;
  liveChat: boolean;
  subscriptions: boolean;
  marketplace: boolean;
  b2bFeatures: boolean;
}

/**
 * Cache configuration structure
 */
export interface CacheConfig {
  redis: {
    enabled: boolean;
    ttl: number;
    keyPrefix: string;
  };
  memory: {
    enabled: boolean;
    max: number;
    ttl: number;
  };
  cdn: {
    enabled: boolean;
    provider: 'cloudflare' | 'aws' | 'gcp';
    domain: string;
    ttl: number;
  };
}

/**
 * Complete application configuration
 */
export interface Config {
  app: AppConfig;
  database: DatabaseConfig;
  redis: RedisConfig;
  auth: AuthConfig;
  email: EmailConfig;
  storage: StorageConfig;
  payment: PaymentConfig;
  analytics: AnalyticsConfig;
  monitoring: MonitoringConfig;
  rateLimit: RateLimitConfig;
  security: SecurityConfig;
  featureFlags: FeatureFlagsConfig;
  cache: CacheConfig;
}

// ============================================================================
// ENVIRONMENT CONFIGURATION TYPES
// ============================================================================

/**
 * Environment variables structure
 */
export interface EnvironmentVariables {
  // Application
  NODE_ENV: 'development' | 'staging' | 'production';
  PORT: string;
  HOST: string;
  BASE_URL: string;
  API_URL: string;
  WEB_URL: string;
  
  // Database
  DATABASE_URL: string;
  DATABASE_HOST: string;
  DATABASE_PORT: string;
  DATABASE_NAME: string;
  DATABASE_USERNAME: string;
  DATABASE_PASSWORD: string;
  DATABASE_SSL: string;
  
  // Redis
  REDIS_URL: string;
  REDIS_HOST: string;
  REDIS_PORT: string;
  REDIS_PASSWORD?: string;
  REDIS_DB: string;
  
  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  BCRYPT_ROUNDS: string;
  SESSION_SECRET: string;
  
  // OAuth
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  FACEBOOK_CLIENT_ID?: string;
  FACEBOOK_CLIENT_SECRET?: string;
  
  // Email
  EMAIL_PROVIDER: 'smtp' | 'sendgrid' | 'ses' | 'mailgun';
  EMAIL_FROM_NAME: string;
  EMAIL_FROM_EMAIL: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SENDGRID_API_KEY?: string;
  SES_ACCESS_KEY_ID?: string;
  SES_SECRET_ACCESS_KEY?: string;
  SES_REGION?: string;
  MAILGUN_API_KEY?: string;
  MAILGUN_DOMAIN?: string;
  
  // Storage
  STORAGE_PROVIDER: 'local' | 's3' | 'gcs' | 'azure';
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_REGION?: string;
  S3_BUCKET?: string;
  GCS_PROJECT_ID?: string;
  GCS_KEY_FILENAME?: string;
  GCS_BUCKET?: string;
  AZURE_CONNECTION_STRING?: string;
  AZURE_CONTAINER?: string;
  
  // Payment
  STRIPE_PUBLISHABLE_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  PAYPAL_CLIENT_ID?: string;
  PAYPAL_CLIENT_SECRET?: string;
  PAYPAL_ENVIRONMENT?: 'sandbox' | 'live';
  
  // Analytics
  GOOGLE_ANALYTICS_MEASUREMENT_ID?: string;
  GOOGLE_ANALYTICS_API_SECRET?: string;
  MIXPANEL_PROJECT_TOKEN?: string;
  MIXPANEL_API_SECRET?: string;
  
  // Monitoring
  SENTRY_DSN?: string;
  DATADOG_API_KEY?: string;
  NEWRELIC_LICENSE_KEY?: string;
  
  // Security
  CORS_ORIGIN: string;
  CSRF_SECRET: string;
  RATE_LIMIT_WINDOW_MS: string;
  RATE_LIMIT_MAX: string;
}

// ============================================================================
// CONFIGURATION VALIDATION TYPES
// ============================================================================

/**
 * Configuration validation result
 */
export interface ConfigValidationResult {
  isValid: boolean;
  errors: Array<{
    key: string;
    message: string;
    value?: unknown;
  }>;
  warnings: Array<{
    key: string;
    message: string;
    value?: unknown;
  }>;
}

/**
 * Configuration loader options
 */
export interface ConfigLoaderOptions {
  envFile?: string;
  validate?: boolean;
  required?: string[];
  defaults?: Record<string, unknown>;
  transformers?: Record<string, (value: string) => unknown>;
}

// Types are already exported inline above
// No need for additional export block
