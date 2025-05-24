# E-commerce Backend

## 🚀 Quick Start

### Primary Development (Serverless - Recommended)
```bash
npm start          # Start serverless offline (port 3003)
npm run dev        # Start with auto-reload (port 3003)
npm run health     # Check health at localhost:3003/health
```

### Traditional Server (Backup/Debugging)
```bash
npm run start:traditional     # Traditional Express server (port 3002)
npm run dev:traditional       # Traditional with auto-reload (port 3002)
npm run health:traditional    # Check health at localhost:3002/health
```

## 🎯 Why Serverless-First Development?

Since production deploys to **AWS Lambda**, serverless-offline ensures:
- ✅ **Production parity** - Same environment as deployment
- ✅ **Lambda limitations testing** - Memory, timeout, cold starts
- ✅ **API Gateway simulation** - Proper routing and headers
- ✅ **Environment consistency** - Same .env loading behavior

## 🔧 Development Commands

### Core Development
| Command | Purpose | Port |
|---------|---------|------|
| `npm start` | **Primary development** (serverless) | 3003 |
| `npm run dev` | **Auto-reload development** (serverless) | 3003 |
| `npm run start:traditional` | Backup traditional server | 3002 |

### Database
| Command | Purpose |
|---------|---------|
| `npm run migrate` | Run latest migrations |
| `npm run seed` | Seed database |
| `npm run db:reset` | Reset and reseed database |

### Deployment
| Command | Purpose |
|---------|---------|
| `npm run deploy:dev` | Deploy to development stage |
| `npm run deploy:prod` | Deploy to production stage |
| `npm run remove` | Remove serverless stack |

### Monitoring
| Command | Purpose |
|---------|---------|
| `npm run observability:start` | Start Grafana/Prometheus |
| `npm run health` | Check serverless health |
| `npm run logs` | View serverless logs |

## 🏗️ Architecture

- **Primary**: Serverless (AWS Lambda + API Gateway)
- **Database**: AWS RDS PostgreSQL with Knex ORM
- **Observability**: OpenTelemetry + Grafana + Prometheus
- **Guard Rails**: Rate limiting, circuit breakers, security headers

## 📝 Environment Setup

1. Copy `.env.example` to `.env`
2. Configure your AWS RDS credentials
3. Run `npm run migrate` to set up database
4. Run `npm start` to begin development 