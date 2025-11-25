# Reech SaaS - Repository Architecture & File Structure

## 📋 Project Overview

**Reech SaaS** is a multi-tenant SaaS application built with Next.js 15, featuring custom subdomain routing for each tenant. This is a production-ready template for building multi-tenant applications with subdomain-based tenant isolation.

### 🏗️ Architecture Type
- **Multi-tenant SaaS application**
- **Subdomain-based tenant routing**
- **Server-side rendering with Next.js App Router**
- **Redis-based data storage**

## 🛠️ Tech Stack

### Core Technologies
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling framework
- **shadcn/ui** - Component library

### Data & Storage
- **Upstash Redis** - Key-value storage for tenant data
- **Server Actions** - Form handling and data mutations

### Development & Deployment
- **pnpm** - Package manager
- **Vercel** - Deployment platform
- **Turbopack** - Fast bundler for development

## 📁 Complete File Structure

```
reech-saas/
├── 📁 app/                          # Next.js App Router directory
│   ├── 📁 admin/                    # Admin dashboard
│   │   ├── 📄 dashboard.tsx         # Admin dashboard component
│   │   └── 📄 page.tsx              # Admin page route
│   ├── 📁 s/                        # Subdomain routes
│   │   └── 📁 [subdomain]/          # Dynamic subdomain route
│   │       └── 📄 page.tsx          # Subdomain page component
│   ├── 📄 actions.ts                # Server actions for form handling
│   ├── 📄 favicon.ico               # Site favicon
│   ├── 📄 globals.css               # Global styles and Tailwind config
│   ├── 📄 layout.tsx                # Root layout component
│   ├── 📄 not-found.tsx             # 404 page component
│   ├── 📄 page.tsx                  # Home page component
│   └── 📄 subdomain-form.tsx        # Subdomain creation form
├── 📁 components/                   # Reusable components
│   └── 📁 ui/                       # shadcn/ui components
│       ├── 📄 button.tsx            # Button component
│       ├── 📄 card.tsx              # Card component
│       ├── 📄 dialog.tsx            # Dialog component
│       ├── 📄 emoji-picker.tsx      # Emoji picker component
│       ├── 📄 input.tsx             # Input component
│       ├── 📄 label.tsx             # Label component
│       └── 📄 popover.tsx           # Popover component
├── 📁 lib/                          # Utility libraries
│   ├── 📄 redis.ts                  # Redis client configuration
│   ├── 📄 subdomains.ts             # Subdomain management utilities
│   └── 📄 utils.ts                  # General utilities
├── 📁 node_modules/                 # Dependencies (auto-generated)
├── 📄 .gitignore                    # Git ignore rules
├── 📄 components.json               # shadcn/ui configuration
├── 📄 middleware.ts                 # Next.js middleware for subdomain routing
├── 📄 next-env.d.ts                 # Next.js TypeScript declarations
├── 📄 next.config.ts                # Next.js configuration
├── 📄 package.json                  # Project dependencies and scripts
├── 📄 pnpm-lock.yaml                # Package lock file
├── 📄 postcss.config.mjs            # PostCSS configuration
├── 📄 README.md                     # Project documentation
├── 📄 tsconfig.json                 # TypeScript configuration
└── 📄 tsconfig.tsbuildinfo          # TypeScript build cache
```

## 🔧 Key Configuration Files

### package.json
```json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build", 
    "start": "next start"
  },
  "dependencies": {
    "next": "15.3.2",
    "react": "^19.1.0",
    "@upstash/redis": "^1.34.9",
    "@radix-ui/*": "^1.x.x",
    "tailwind-merge": "^3.3.0"
  }
}
```

### tsconfig.json
- **Target**: ES2017
- **Module**: ESNext with bundler resolution
- **JSX**: Preserve (for Next.js)
- **Paths**: `@/*` alias for root directory

### next.config.ts
- Basic Next.js configuration
- Experimental features support
- Vercel Analytics integration ready

## 🏛️ Application Architecture

### 1. Multi-Tenant Routing System

#### Middleware (`middleware.ts`)
- **Purpose**: Handles subdomain detection and routing
- **Features**:
  - Local development support (`*.localhost:3000`)
  - Production subdomain detection
  - Vercel preview deployment support
  - Admin route protection

#### Subdomain Detection Logic
```typescript
// Local: tenant.localhost:3000
// Production: tenant.yourdomain.com
// Vercel: tenant---branch.vercel.app
```

### 2. Data Layer

#### Redis Storage (`lib/redis.ts`)
- **Client**: Upstash Redis
- **Key Pattern**: `subdomain:{name}`
- **Data Structure**:
  ```typescript
  {
    emoji: string,
    createdAt: number
  }
  ```

#### Subdomain Management (`lib/subdomains.ts`)
- **Functions**:
  - `getSubdomainData(subdomain)` - Fetch tenant data
  - `getAllSubdomains()` - List all tenants
  - `isValidIcon(icon)` - Emoji validation

### 3. User Interface

#### Main Application (`app/page.tsx`)
- **Purpose**: Landing page with subdomain creation form
- **Features**: Subdomain form, admin link, branding

#### Admin Dashboard (`app/admin/`)
- **Purpose**: Tenant management interface
- **Features**: 
  - List all subdomains
  - Delete subdomains
  - View tenant details
  - Direct links to tenant pages

#### Tenant Pages (`app/s/[subdomain]/page.tsx`)
- **Purpose**: Individual tenant pages
- **Features**: Custom emoji display, tenant branding

### 4. Form Handling

#### Server Actions (`app/actions.ts`)
- **createSubdomainAction**: Creates new tenants
- **deleteSubdomainAction**: Removes tenants
- **Validation**: Subdomain format, emoji validation, uniqueness

#### Form Components
- **SubdomainForm**: Main creation form with emoji picker
- **Validation**: Real-time feedback, error handling

## 🔄 Data Flow

### 1. Subdomain Creation Flow
```
User Input → Form Validation → Server Action → Redis Storage → Redirect to Subdomain
```

### 2. Subdomain Access Flow
```
Request → Middleware → Subdomain Detection → Data Fetch → Page Render
```

### 3. Admin Management Flow
```
Admin Access → Data Fetch → Display List → Action (Delete) → Cache Revalidation
```

## 🚀 Development Workflow

### Local Development
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Access points:
# - Main site: http://localhost:3000
# - Admin: http://localhost:3000/admin  
# - Tenants: http://[tenant].localhost:3000
```

### Environment Variables
```env
KV_REST_API_URL=your_redis_url
KV_REST_API_TOKEN=your_redis_token
NEXT_PUBLIC_ROOT_DOMAIN=localhost:3000
```

## 🎯 Key Features

### ✅ Implemented Features
- Custom subdomain routing with Next.js middleware
- Tenant-specific content and pages
- Redis-based tenant data storage
- Admin interface for tenant management
- Emoji support for tenant branding
- Local development with subdomain support
- Vercel deployment compatibility
- TypeScript throughout
- Responsive design with Tailwind CSS
- Server-side rendering
- Form validation and error handling

### 🔧 Technical Features
- **Middleware-based routing** for subdomain detection
- **Server Actions** for form handling
- **Redis integration** for data persistence
- **Dynamic metadata** generation
- **Error boundaries** and 404 handling
- **Performance optimization** with Turbopack
- **Type safety** with TypeScript

## 📊 Component Architecture

### UI Components (shadcn/ui)
- **Button**: Primary, secondary, ghost variants
- **Card**: Container for content sections
- **Dialog**: Modal dialogs
- **Input**: Form input fields
- **Label**: Form labels
- **Popover**: Dropdown content
- **EmojiPicker**: Custom emoji selection

### Page Components
- **HomePage**: Landing page with subdomain creation
- **AdminDashboard**: Tenant management interface
- **SubdomainPage**: Individual tenant pages
- **SubdomainForm**: Creation form with validation

## 🔐 Security Considerations

### Current Implementation
- **Input validation** for subdomains and emojis
- **Sanitization** of subdomain names
- **Admin route protection** (basic)
- **Environment variable** protection

### Recommended Enhancements
- **Authentication system** for admin access
- **Rate limiting** for subdomain creation
- **CSRF protection** for forms
- **Input sanitization** for XSS prevention

## 🚀 Deployment

### Vercel Deployment
1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Set up custom domain with wildcard DNS
4. Deploy with automatic previews

### Domain Configuration
- **Root domain**: `yourdomain.com`
- **Wildcard DNS**: `*.yourdomain.com`
- **SSL**: Automatic with Vercel

## 📈 Scalability Considerations

### Current Architecture
- **Single Redis instance** for data storage
- **Stateless application** for horizontal scaling
- **CDN-ready** static assets
- **Edge-compatible** middleware

### Future Enhancements
- **Database migration** for complex data
- **Caching layer** for performance
- **Load balancing** for high traffic
- **Monitoring and analytics** integration

## 🧪 Testing Strategy

### Current State
- **Type safety** with TypeScript
- **Runtime validation** for forms
- **Error handling** throughout

### Recommended Additions
- **Unit tests** for utilities
- **Integration tests** for server actions
- **E2E tests** for user flows
- **Performance testing** for subdomain routing

---

## 📝 Development Notes

### Code Quality
- **TypeScript strict mode** enabled
- **ESLint and Prettier** ready
- **Component-based architecture**
- **Server-side rendering** optimized

### Performance
- **Turbopack** for fast development
- **Static generation** where possible
- **Optimized images** and assets
- **Minimal bundle size**

### Maintainability
- **Modular component structure**
- **Clear separation of concerns**
- **Comprehensive documentation**
- **Type-safe APIs**

This architecture provides a solid foundation for building scalable multi-tenant SaaS applications with Next.js 15 and modern web technologies.





