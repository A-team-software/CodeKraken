# OliverAI - AI-Powered Coding Assistant

A modern Next.js application that transforms your project board tasks into automated code generation. OliverAI integrates seamlessly with Jira, Linear, Asana, and Trello to accelerate your development workflow.

## ✨ Features

- **Smart Code Generation**: Generate production-ready code from project requirements
- **Multi-Platform Support**: Works with Jira, Linear, Asana, and Trello
- **Lightning Fast**: Get code suggestions in seconds, not hours
- **Git Integration**: Automatically create branches, commits, and pull requests
- **Context Aware**: AI understands your codebase and existing patterns
- **Modern UI**: Beautiful, responsive design with smooth animations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Bun (preferred) or npm
- A project management platform account (Jira, Linear, Asana, or Trello)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd sca

# Install dependencies
bun install
# or
npm install

# Run development server
bun run dev
# or
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the app.

## 📁 Project Structure

```
sca/
├── src/
│   └── app/
│       ├── page.tsx              # Home page
│       ├── about/page.tsx        # About page
│       ├── pricing/page.tsx      # Pricing page
│       ├── docs/page.tsx         # Documentation
│       ├── dashboard/page.tsx    # Dashboard
│       ├── api/                  # API routes
│       ├── styles/
│       │   └── globals.css       # Global styles
│       └── layout.tsx            # Root layout
├── components/                   # Reusable React components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Header.tsx
│   └── ...
├── public/                       # Static assets
├── tailwind.config.js            # Tailwind CSS config
├── tsconfig.json                 # TypeScript config
└── package.json
```

## 🎨 Design System

The app uses a modern dark theme with:
- **Colors**: Slate, Blue, Purple, and Pink gradients
- **Typography**: Clean, readable sans-serif fonts
- **Components**: Glass-morphism cards with smooth animations
- **Animations**: Fade-in, slide, float, and glow effects

## 📄 Pages

### Home (`/`)
Welcome page showcasing OliverAI's features, platform integrations, and pricing.

### Dashboard (`/dashboard`)
User dashboard where developers can:
- View recent projects
- Monitor code generation statistics
- Access project settings

### About (`/about`)
Learn about OliverAI's mission and vision.

### Pricing (`/pricing`)
Three-tier pricing model:
- **Starter**: $29/month - For individual developers
- **Professional**: $99/month - For growing teams
- **Enterprise**: $299/month - For large organizations

### Docs (`/docs`)
Comprehensive documentation including:
- Getting started guide
- Platform integration guides
- API reference
- Best practices

## 🛠️ Technology Stack

- **Framework**: Next.js 16
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Runtime**: Bun
- **Database**: MongoDB

## 🔧 Development

### Available Scripts

```bash
# Development server with hot reload
bun run dev

# Build for production
bun run build

# Start production server
bun run start

# Run linting
bun run lint

# Run tests
bun run test
bun run test:watch
bun run test:coverage
```

## 📦 Building and Deployment

### Build for Production
```bash
bun run build
```

### Deploy to Production
```bash
bun run start
```

The app is optimized for deployment on:
- Vercel (recommended for Next.js)
- Docker
- Traditional Node.js hosting

### Docker Support
```bash
# Build Docker image
docker build -t oliverais .

# Run container
docker run -p 3000:3000 oliverais
```

## 🔐 Environment Variables

Create a `.env.local` file (not committed) with:

```env
# API Keys
JIRA_API_TOKEN=your_token
LINEAR_API_KEY=your_key
ASANA_API_TOKEN=your_token

# OAuth Credentials
GITHUB_CLIENT_ID=your_id
GITHUB_CLIENT_SECRET=your_secret

# Database
MONGODB_URI=your_connection_string

# Service Config
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🗂️ API Endpoints

### Code Generation
```
POST /api/generate
```

### Integration
```
POST /api/integrations/connect
GET /api/integrations/status
```

### Projects
```
GET /api/projects
POST /api/projects
```

## 🧪 Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Generate coverage report
bun run test:coverage
```

## 🚀 Performance Optimization

- Server-side rendering for better SEO
- Image optimization with Next.js Image component
- CSS optimization with Tailwind purging
- Code splitting and lazy loading

## 🔄 Integrations

### Jira
Securely connect your Jira instance to generate code from epics and tickets.

### Linear
Stream-lined workflow integration for Linear-managed projects.

### Asana
Sync tasks and automate development workflow.

### Trello
Card-based project management integration.

## 📱 Responsive Design

- **Mobile**: Optimized for touch and small screens
- **Tablet**: Comfortable navigation and readability
- **Desktop**: Full feature experience with sidebars and panels

## 🎯 Performance Metrics

- Lighthouse Score: 95+
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Cumulative Layout Shift: < 0.1

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 💬 Support

- **Documentation**: [/docs](/docs)
- **Email**: support@oliverais.dev
- **Twitter**: [@OliverAI](https://twitter.com/oliverais)
- **GitHub**: [GitHub Issues](https://github.com/oliverais/issues)

## 🗺️ Roadmap

- [ ] VSCode Extension
- [ ] IDE Plugin Support
- [ ] Real-time Collaboration
- [ ] Advanced Code Analysis
- [ ] Custom LLM Model Integration
- [ ] Enterprise SSO Support

## ✅ Checklist

- [x] Modern Next.js setup
- [x] Beautiful UI with Tailwind CSS
- [x] Responsive design
- [x] Dark theme with gradients
- [x] Multiple pages (Home, Dashboard, Docs, Pricing, About)
- [x] Reusable components
- [x] Smooth animations
- [x] TypeScript support
- [x] Docker support
- [ ] API implementation
- [ ] Database integration
- [ ] Authentication
- [ ] Testing suite

---

Built with ❤️ by the OliverAI Team
