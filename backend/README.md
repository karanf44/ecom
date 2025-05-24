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
| `npm run migrate:status` | Check migration status |
| `npm run db:backup` | Create database backup |

### Deployment & Operations
| Command | Purpose |
|---------|---------|
| `npm run deploy:dev` | Deploy to development stage |
| `npm run deploy:staging` | Deploy to staging stage |
| `npm run deploy:prod` | Deploy to production stage |
| `npm run deploy:rollback:prod` | Rollback production deployment |

### Health Checks & Testing
| Command | Purpose |
|---------|---------|
| `npm run health:check` | Comprehensive health check (local) |
| `npm run health:dev` | Health check dev environment |
| `npm run health:staging` | Health check staging environment |
| `npm run health:prod` | Health check production environment |
| `npm run test:integration` | Run integration tests |

### Image Upload & Media
| Command | Purpose |
|---------|---------|
| `POST /api/products/images/upload` | Upload product images directly to products table |
| `POST /api/users/profile/image` | Upload user profile pictures directly to users table |
| `DELETE /api/products/{productId}/image` | Delete product images and S3 files |
| `DELETE /api/users/profile/image` | Delete user profile images and S3 files |

### Monitoring & Logs
| Command | Purpose |
|---------|---------|
| `npm run observability:start` | Start Grafana/Prometheus |
| `npm run logs:dev` | View dev environment logs |
| `npm run logs:staging` | View staging environment logs |
| `npm run logs:prod` | View production environment logs |
| `npm run security:audit` | Security vulnerability scan |

## 🚀 Deployment Strategy

### **Environment Progression**
```
┌─────────────┐    ┌─────────┐    ┌─────────┐    ┌────────────┐
│   Local     │ → │   Dev   │ → │ Staging │ → │ Production │
│ Development │    │  (AWS)  │    │ (AWS)   │    │   (AWS)    │
└─────────────┘    └─────────┘    └─────────┘    └────────────┘
  Manual              Auto         Manual         Manual
  Testing           (CI/CD)      (Approval)     (Approval)
```

### **Deployment Workflow**
| Environment | Trigger | Command | Approval | Health Check |
|-------------|---------|---------|----------|--------------|
| **Dev** | Auto (merge to develop) | `npm run deploy:dev` | None | Automated |
| **Staging** | Manual | `npm run deploy:staging` | Team Lead | Manual |
| **Production** | Manual | `npm run deploy:prod` | DevOps + PM | Comprehensive |

### **Pre-Deployment Checklist**
```bash
# 1. Run tests and validations
npm test                        # Unit tests
npm run security:audit         # Security scan  
npm run health:check          # Local health check
npm run validate:env          # Environment validation

# 2. Database preparation
npm run migrate:status        # Check pending migrations
npm run db:backup            # Create backup (staging/prod)

# 3. Deploy to target environment
npm run deploy:staging       # Deploy to staging first
npm run health:staging       # Verify staging deployment
npm run deploy:prod         # Deploy to production
```

### **Post-Deployment Verification**
```bash
# Immediate checks (automated in CI/CD)
npm run health:prod          # Health endpoint verification
npm run test:integration     # Critical user flows
curl https://api/health      # Direct API test

# Monitoring (first 30 minutes)
npm run logs:prod           # Watch application logs  
npm run metrics            # Monitor performance metrics
# Check error rates, response times, database connections
```

### **Rollback Procedures**
```bash
# Immediate rollback (< 5 minutes)
npm run deploy:rollback:prod    # Revert Lambda deployment
npm run health:prod            # Verify rollback success

# Database rollback (if needed)
npm run migrate:rollback       # Revert schema changes
npm run db:restore            # Restore from backup

# Emergency procedures
AWS Console → Lambda → Revert to previous version
API Gateway → Revert stage to previous deployment
```

## 🏗️ Architecture

- **Primary**: Serverless (AWS Lambda + API Gateway)
- **Database**: AWS RDS PostgreSQL with Knex ORM
- **Observability**: OpenTelemetry + Grafana + Prometheus
- **Guard Rails**: Rate limiting, circuit breakers, security headers
- **CI/CD**: GitHub Actions with multi-environment pipeline
- **Monitoring**: CloudWatch + Custom health checks

## 📝 Environment Setup

### **Initial Setup**
1. **AWS Configuration**: Set up IAM roles and VPC for each environment
2. **Database Setup**: Configure RDS instances for dev/staging/prod
3. **Environment Variables**: Copy and configure `.env.example`
4. **Migrations**: Run `npm run migrate` to set up database schema
5. **Validation**: Run `npm run health:check` to verify setup

### **Required Environment Variables (per stage)**
```bash
# Database Configuration
DB_HOST_dev=your-dev-rds.amazonaws.com
DB_HOST_staging=your-staging-rds.amazonaws.com  
DB_HOST_prod=your-prod-rds.amazonaws.com
DB_NAME_dev=ecommerce_dev
DB_USERNAME_dev=admin
DB_PASSWORD_dev=secure_password

# Security
JWT_SECRET_dev=development-jwt-secret-key
JWT_SECRET_staging=staging-jwt-secret-key
JWT_SECRET_prod=production-jwt-secret-key

# AWS Infrastructure  
SECURITY_GROUP_ID_dev=sg-dev123
SUBNET_ID_1_dev=subnet-dev123
SUBNET_ID_2_dev=subnet-dev456
# Repeat for staging/prod environments
```

## 📚 Documentation

- **[📋 Deployment Strategy](docs/deployment-strategy.md)** - Comprehensive deployment guide
- **[🏥 Health Check Script](scripts/health-check.js)** - Automated health verification  
- **[🔄 CI/CD Workflows](.github/workflows/)** - GitHub Actions pipelines
- **[📸 Image Upload API](docs/image-upload-api.md)** - Complete image upload documentation
- **[🛡️ Security Guidelines](docs/security.md)** - Security best practices

## 🎯 Success Metrics & SLAs

### **Deployment KPIs**
- **Deployment Success Rate**: > 95%
- **Average Deployment Time**: < 15 minutes  
- **Rollback Time**: < 5 minutes
- **Zero-Downtime Deployments**: 99.9%

### **Application SLAs**
- **Uptime**: 99.9% 
- **Response Time**: < 200ms (p95)
- **Error Rate**: < 0.1%
- **Database Response Time**: < 100ms

---

**This serverless-first architecture ensures reliable, secure, and fast deployments while maintaining high availability and quick recovery capabilities.** 🎯 