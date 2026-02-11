# Trust Builder

**Trust Builder** is a vertical-slice implementation of the Future's Edge platform, built on the ONE ontology. It demonstrates crypto-native patterns for mission-based collaboration, claim verification, and trust score accrual—without deploying to a blockchain.

Built with Astro 5, React 19, NeonDB (Postgres), and Shadcn UI.

## ✨ What's Inside

- **Astro 5.14+** - Lightning-fast static site generation
- **React 19** - Latest React with improved performance
- **Tailwind CSS v4** - Modern CSS-based configuration with HSL colors
- **Shadcn/UI** - Complete component library (50+ components)
- **TypeScript 5.9+** - Full type safety with strict mode
- **Dark Mode** - Beautiful theme switching with no FOUC
- **Blog System** - Full-featured with search, tags, categories, ToC
- **SEO Optimized** - Sitemap, RSS feed, OG tags, canonical URLs
- **Accessibility** - WCAG 2.1 AA compliant with keyboard navigation
- **100/100 Lighthouse** - Perfect performance scores

### 🎨 Screenshots

![Astro Shadcn UI](https://astro-shadcn.one.ie/screenshots/screenshot.png)

## 🚀 Quick Start

### Prerequisites

- **[Bun](https://bun.sh/)** v1.0+ (JavaScript runtime)
- **[NeonDB](https://neon.tech/)** account (serverless Postgres)
- **[Resend](https://resend.com/)** account (email magic links)
- Git

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/pedrogrande/edgetrust.git
cd edgetrust

# Install dependencies
bun install
```

### 2. Database Setup

1. Create a new project on [NeonDB](https://neon.tech/)
2. Copy your connection string (it looks like `postgresql://user:pass@host/dbname`)
3. Run the schema migration:

```bash
# Set your database URL
export DATABASE_URL="postgresql://your-connection-string"

# Deploy schema
psql "$DATABASE_URL" -f project/trust-builder/product-manager/stories/S1-01-schema.sql

# Load seed data (creates test accounts and initial mission)
psql "$DATABASE_URL" -f project/trust-builder/product-manager/stories/S1-01-seed.sql
```

### 3. Email Setup

1. Sign up for [Resend](https://resend.com/)
2. Get your API key from the dashboard
3. (Optional) Verify your sending domain for production use

### 4. Environment Configuration

Create **two** environment files:

#### `.env` (for build-time variables)

```bash
DATABASE_URL=postgresql://your-connection-string
RESEND_API_KEY=re_your_api_key
RESEND_FROM="Trust Builder <noreply@yourdomain.com>"
```

#### `.dev.vars` (for Cloudflare Workers/runtime)

```bash
DATABASE_URL=postgresql://your-connection-string
RESEND_API_KEY=re_your_api_key
RESEND_FROM="Trust Builder <noreply@yourdomain.com>"
```

⚠️ **Security**: Both files are gitignored. Never commit credentials.

### 5. Run the Dev Server

```bash
bun dev
```

Visit `http://localhost:4321` 🎉

### 6. Test Accounts

The seed data creates these test accounts:

| Member ID  | Email                  | Role     | Purpose        |
| ---------- | ---------------------- | -------- | -------------- |
| FE-M-00000 | system@futuresedge.org | guardian | System account |
| FE-M-00002 | (set your email)       | guardian | Admin testing  |
| FE-M-00005 | (set your email)       | explorer | User testing   |

**To sign in:**

1. Go to `/trust-builder/signin`
2. Enter your email
3. Check your inbox for the magic link
4. Click to authenticate

**Guardian access:**

- Admin dashboard: `/trust-builder/admin/tasks`
- Create tasks, manage missions, review claims

## � Architecture

### ONE Ontology Dimensions

Trust Builder implements 6 core dimensions:

1. **Groups** → `missions` table (parent missions, sub-missions)
2. **People** → `members` table (FE-M-XXXXX IDs, roles, trust scores)
3. **Things** → `tasks` table (draft → open → completed states)
4. **Connections** → `claims`, `memberships`, `task_incentives` tables
5. **Events** → `events` table (append-only audit log)
6. **Knowledge** → Derived via queries (trust scores calculated from approved claims)

### Quasi-Smart Contract Patterns

- **State Immutability**: Published tasks lock core fields
- **Event Sourcing**: All state changes logged to `events` table
- **Atomic Transactions**: Multi-table writes use `withTransaction()`
- **Optimistic Locking**: Race condition protection via `WHERE state='draft'`
- **Trust Score Derivation**: Never stored directly, always calculated

### Tech Stack

- **Frontend**: Astro 5 (SSR) + React 19 islands + Shadcn UI
- **Database**: NeonDB (serverless Postgres) + Drizzle ORM
- **Auth**: Email magic links (14-day HttpOnly cookies)
- **Runtime**: Bun (development) / Node 20+ (production)
- **Deployment**: Compatible with Cloudflare Pages, Vercel, Netlify

## 🎯 Key Features

### 📝 Advanced Blog System

- **Content Collections** - Type-safe blog posts with Zod validation
- **Multi-view Layouts** - List, 2-column, 3-column, and 4-column grid views
- **Real-time Search** - Instant filtering by title and description
- **Rich Metadata** - Tags, categories, author, featured posts, reading time
- **Table of Contents** - Auto-generated with IntersectionObserver tracking
- **Social Sharing** - Native Web Share API + social media buttons
- **RSS Feed** - Auto-generated at `/rss.xml`

### 🔍 SEO & Performance

- **Meta Tags** - Open Graph, Twitter Cards, canonical URLs
- **Sitemap** - Auto-generated with `@astrojs/sitemap`
- **Image Optimization** - Astro's built-in Image component with lazy loading
- **Minimal JavaScript** - Only interactive components hydrate
- **Perfect Scores** - 100/100 Lighthouse across all metrics

### ♿ Accessibility Features

- **Skip to Content** - Keyboard-accessible skip link
- **ARIA Labels** - Proper semantic markup throughout
- **Focus Indicators** - Visible focus states on all interactive elements
- **Screen Reader Support** - Tested with VoiceOver and NVDA
- **Keyboard Navigation** - Fully navigable without a mouse

### 🛠️ Developer Experience

- **ESLint & Prettier** - Pre-configured code formatting
- **VS Code Settings** - Optimized workspace configuration
- **Path Aliases** - Clean imports with `@/` prefix
- **Type Safety** - Strict TypeScript with no implicit any
- **Hot Reload** - Fast refresh during development

## 🎨 Pre-installed Components

All Shadcn/UI components are pre-configured for Astro with 50+ components ready to use:

```astro
---
// Example usage in .astro file
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
---

<Button client:load>Click me!</Button>
```

### Available Components (50+)

**Layout & Navigation:**

- ✅ Sidebar, Navigation Menu, Breadcrumb, Tabs

**Forms & Inputs:**

- ✅ Button, Input, Textarea, Select, Checkbox, Radio Group, Switch, Slider, Calendar, Date Picker, Input OTP

**Data Display:**

- ✅ Card, Table, Badge, Avatar, Progress, Chart (Recharts), Carousel

**Feedback & Overlays:**

- ✅ Dialog, Alert Dialog, Sheet, Drawer, Popover, Tooltip, Toast, Sonner, Alert

**Interactive:**

- ✅ Accordion, Collapsible, Dropdown Menu, Context Menu, Menubar, Hover Card, Command, Resizable Panels

**Custom Components:**

- ✅ BlogSearch - Real-time blog post filtering
- ✅ TableOfContents - Auto-generated with active tracking
- ✅ ShareButtons - Native + social media sharing
- ✅ ErrorBoundary - React error boundary with alerts
- ✅ ModeToggle - Theme switcher component

## 🛠️ Project Structure

```text
astro-shadcn/
├── src/
│   ├── components/
│   │   ├── ui/              # 50+ Shadcn components
│   │   ├── BlogSearch.tsx   # Real-time blog search
│   │   ├── TableOfContents.tsx
│   │   ├── ShareButtons.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── ModeToggle.tsx   # Theme switcher
│   │   └── Sidebar.tsx      # Expandable navigation
│   ├── layouts/
│   │   ├── Layout.astro     # Base layout with SEO
│   │   └── Blog.astro       # Blog post layout with ToC
│   ├── pages/
│   │   ├── index.astro      # Homepage
│   │   ├── blog/
│   │   │   ├── index.astro  # Blog index with search
│   │   │   └── [...slug].astro # Dynamic blog posts
│   │   ├── rss.xml.ts       # RSS feed generator
│   │   └── 404.astro        # Custom 404 page
│   ├── content/
│   │   ├── config.ts        # Content collections schema
│   │   └── blog/            # Blog posts in markdown
│   ├── lib/
│   │   ├── utils.ts         # cn() utility for Tailwind
│   │   └── reading-time.ts  # Reading time calculator
│   ├── config/
│   │   └── site.ts          # Site configuration
│   └── styles/
│       └── global.css       # Tailwind v4 with @theme blocks
├── .vscode/
│   ├── settings.json        # Workspace settings
│   └── extensions.json      # Recommended extensions
├── astro.config.mjs         # Astro + sitemap config
├── components.json          # Shadcn/ui configuration
├── .eslintrc.json           # ESLint configuration
├── .prettierrc              # Prettier configuration
├── tsconfig.json            # TypeScript with path aliases
└── CLAUDE.md                # AI assistant instructions
```

### Using Components

```astro
---
// src/pages/index.astro
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
---

<Card>
  <CardHeader>
    <CardTitle>Welcome to Astro + Shadcn!</CardTitle>
  </CardHeader>
  <Button client:load>Interactive Button</Button>
</Card>
```

## 🚀 Development Workflow

### Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm build            # Build for production
pnpm preview          # Preview production build

# Code Quality
pnpm lint             # Lint code with ESLint
pnpm format           # Format with Prettier

# Type Checking
npx astro check       # TypeScript type checking
npx astro sync        # Sync content collection types

# Testing (Sprint 3)
pnpm test             # Run all tests
pnpm test:watch       # Run tests in watch mode
pnpm test:ui          # Open Vitest UI dashboard
pnpm test:coverage    # Generate coverage report
```

### Testing Infrastructure

**Test Framework**: Vitest 4.0+ with @testing-library/react

Trust Builder uses Vitest for fast, ESM-native testing with TypeScript support. All business logic and API endpoints have comprehensive test coverage focusing on quasi-smart contract validation.

**Test Coverage Targets:**

- **Overall Coverage**: 40% minimum (Sprint 3)
- **Critical Path**: 80% coverage of migration-critical logic
- **Contract Validation**: Append-only events, immutable tasks, Trust Score derivation

**Running Tests:**

```bash
# Run all tests once
pnpm test

# Watch mode (re-runs on file changes)
pnpm test:watch

# Interactive UI dashboard (recommended for development)
pnpm test:ui

# Generate coverage report (HTML + JSON)
pnpm test:coverage
```

**Test File Locations:**

```text
src/
├── lib/
│   ├── __tests__/
│   │   ├── setup.ts              # Test configuration
│   │   ├── fixtures/
│   │   │   └── members.ts        # Reusable test data
│   │   └── trust-score-calculator.test.ts
│   ├── contracts/__tests__/
│   │   └── claim-engine.test.ts  # Business logic tests
│   ├── events/__tests__/
│   │   └── logger.test.ts        # Event logging tests
│   └── api/__tests__/
│       ├── auth-verify.test.ts   # API integration tests
│       ├── claim-submission.test.ts
│       └── claim-review.test.ts
```

**Writing Tests:**

```typescript
// Example unit test with fixtures
import { describe, it, expect } from 'vitest';
import { testMember, testTask } from '@/lib/__tests__/fixtures/members';

describe('Trust Score Calculation', () => {
  it('should sum approved claim points', () => {
    const claims = [
      { points: 50, status: 'approved' },
      { points: 25, status: 'approved' },
    ];
    const total = claims.reduce((sum, c) => sum + c.points, 0);
    expect(total).toBe(75);
  });
});
```

**Test Fixtures:**

Reusable test data is available in `src/lib/__tests__/fixtures/members.ts`:

- `testMember` - Standard member (FE-M-99999, 100 trust score)
- `testSteward` - Steward member (FE-M-99998, 500 trust score)
- `testTask` - Sample documentation task (auto-approve enabled)
- `testClaim` - Submitted claim with proofs

### Git Hooks (Automated Quality Checks)

Trust Builder uses Husky to enforce code quality and prevent common issues:

**Pre-Commit Hook** (runs before `git commit`):

- ✅ TypeScript type checking (`pnpm tsc --noEmit`)
- ✅ Character encoding validation (blocks smart quotes, en-dashes, em-dashes)
- ✅ Checks: `.ts`, `.tsx`, `.js`, `.jsx`, `.astro` files

**Pre-Push Hook** (runs before `git push`):

- ✅ Prevents direct pushes to `main` branch
- ✅ Encourages feature branch workflow
- ✅ Logs bypasses to `.git/hook-bypasses.log` for audit trail

**Hook Messages:**

Hooks use "sanctuary-aligned" language (supportive, educational):

```
🌱 Let's use a feature branch to keep main stable!

   Try: git checkout -b feature/S3-XX-description

   Why? Feature branches enable:
   • Code review through pull requests
   • Safer collaboration and rollback
   • Better tracking of changes
```

**Bypassing Hooks (when absolutely necessary):**

```bash
# Bypass pre-commit (NOT recommended)
git commit --no-verify

# Bypass pre-push (logged to audit trail)
HUSKY_SKIP_HOOKS=1 git push

# Bypasses are logged here:
cat .git/hook-bypasses.log
```

**Why These Hooks?**

1. **Character Encoding**: Prevents TypeScript compilation errors from Markdown-copied smart quotes (recurred in S2-03, S2-04)
2. **Main Branch Protection**: Ensures all changes go through PR review (25% violation rate in Sprint 2)
3. **TypeScript Safety**: Catches type errors before commit, not in CI

### Adding Blog Posts

Create a new markdown file in `src/content/blog/`:

```markdown
---
title: 'Your Post Title'
description: 'A brief description'
date: 2025-01-15
author: 'Your Name'
tags: ['astro', 'react', 'tailwind']
category: 'tutorial'
featured: true
image: '/path/to/image.jpg'
---

Your content here with full markdown support!

## Headings auto-generate Table of Contents

Content is automatically indexed for search.
```

### Using React Components in Astro

```astro
---
// Always add client:load for interactive components
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
---

<!-- Interactive component needs client:load -->
<Dialog client:load>
  <Button client:load>Click me!</Button>
</Dialog>

<!-- Static components don't need hydration -->
<Card>
  <CardHeader>
    <CardTitle>Static Card</CardTitle>
  </CardHeader>
</Card>
```

### Customizing Theme

Edit `src/styles/global.css` to customize colors:

```css
@theme {
  --color-primary: 0 0% 9%;
  --color-background: 0 0% 100%;
  /* Add your custom colors */
}

/* Dark mode overrides */
.dark {
  --color-background: 0 0% 3.9%;
  --color-foreground: 0 0% 98%;
}
```

## 🔍 Troubleshooting

### Common Issues & Solutions

**Type Errors After Adding Content**

```bash
npx astro sync  # Regenerate content collection types
```

**Component Not Interactive**

```astro
<!-- Add client:load directive -->
<Button client:load>Click me</Button>
```

**Styling Issues**

```astro
<!-- Use className (not class) in React components -->
<Button className="custom-class">Button</Button>

<!-- Use class in Astro files -->
<div class="custom-class">Content</div>
```

**Build Failures**

```bash
npx astro check  # Check for TypeScript errors
pnpm lint        # Check for linting errors
```

## 💡 Pro Tips

1. **Component Usage in Astro**

   ```astro
   ---
   // Always import in the frontmatter
   import { Button } from '@/components/ui/button';
   ---

   <!-- Use in template -->
   <Button client:load>Click me!</Button>
   ```

2. **Styling with Tailwind v4**

   ```astro
   <!-- Use semantic color names that work in both light and dark modes -->
   <div class="bg-background text-foreground border border-border">
     <Button class="m-4">Styled Button</Button>
   </div>
   ```

3. **Layout Usage**

   ```astro
   ---
   import Layout from '../layouts/Layout.astro';
   ---

   <Layout title="Home">
     <!-- Your content -->
   </Layout>
   ```

## 📊 Performance & Screenshots

### ⚡ Lighthouse Scores

![Desktop Performance](https://astro-shadcn.one.ie/screenshots/lighthouse-desktop.png)

Perfect scores across all metrics:

- 🚀 Performance: 100
- ♿ Accessibility: 100
- 🔧 Best Practices: 100
- 🔍 SEO: 100

### What Makes It Fast?

- **Islands Architecture** - Only interactive components hydrate
- **Image Optimization** - Automatic WebP conversion and lazy loading
- **Minimal JavaScript** - ~30KB gzipped for the entire site
- **CSS-First** - Tailwind v4 with zero runtime overhead
- **Static Generation** - Pre-rendered pages for instant loads
- **Smart Bundling** - Code splitting and tree shaking enabled

## 📚 Documentation & Resources

### Official Docs

- [Astro Documentation](https://docs.astro.build)
- [Shadcn/UI Components](https://ui.shadcn.com/docs/components/accordion)
- [Tailwind CSS v4 Docs](https://tailwindcss.com/docs)
- [React 19 Release](https://react.dev/blog/2025/01/29/react-19)

### Project Docs

- `CLAUDE.md` - AI assistant instructions and architecture guide
- `improve.md` - Detailed improvement roadmap and best practices

## 🤝 Contributing & Support

- Join [Astro Discord](https://astro.build/chat)
- Check [Astro Documentation](https://docs.astro.build)
- File an [Issue on GitHub](https://github.com/one-ie/astro-shadcn/issues)

## 📦 What's New

### Latest Updates

- ✅ **Blog Search** - Real-time filtering by title/description
- ✅ **Table of Contents** - Auto-generated with active tracking
- ✅ **Social Sharing** - Native Web Share API + social buttons
- ✅ **Enhanced Schema** - Tags, categories, author, reading time
- ✅ **SEO Optimized** - Sitemap, RSS, OG tags, canonical URLs
- ✅ **Accessibility** - WCAG 2.1 AA compliant
- ✅ **Developer Tools** - ESLint, Prettier, VS Code settings
- ✅ **Error Handling** - 404 page + React error boundaries

## 🎯 Use Cases

Perfect for:

- 📝 Technical blogs and documentation sites
- 🎨 Portfolio and personal websites
- 🚀 Landing pages and marketing sites
- 📊 Dashboards and admin panels
- 🛍️ E-commerce frontends
- 📱 Progressive Web Apps

---

Built with 🚀 Astro 5, ⚡ Tailwind v4, ⚛️ React 19, and 🎨 Shadcn/UI by [ONE](https://one.ie)

**License:** MIT
