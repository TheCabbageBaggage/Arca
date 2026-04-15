# Arca ERP - Onboarding Guide

## What is Arca?

Arca is an open-source, **agent-first ERP foundation** for solo operators and small teams. It provides a complete backend for agent tasks, finance, projects, documents, authentication, audit logging, and realtime events, plus a React-based operations console for managing these workflows. Arca replaces traditional story points with **token estimates** because your developers are AI agents, and includes immutable audit logs, spend approval workflows, and multi-LLM provider routing.

## Quick Start

### 1. Login Methods

Arca supports two authentication methods:

#### **Method A: JWT Login (Recommended for Human Operators)**
Use the built-in login form with email/password:
- **Default Admin Credentials:**
  - Email: `admin@arca.local`
  - Password: `admin1234`

**Steps:**
1. Navigate to the Arca frontend (typically `http://localhost`)
2. Enter credentials in the login form
3. The system automatically creates a JWT token and stores it for API calls

#### **Method B: Agent Key (For AI Agents/API Access)**
Use a pre-generated agent key (starts with `erp_agent_sk_`):
1. Obtain an agent key from an admin user
2. Paste the key into the "Agent key or JWT token" field in advanced login mode
3. Click "Use token" to authenticate

### 2. First-Time Setup

If starting from a fresh installation:

```bash
# 1. Clone and configure
git clone https://github.com/your-org/arca.git
cd arca
cp .env.example .env
# Edit .env with your API keys and settings

# 2. Start services
docker compose up --build -d

# 3. Run database migrations
docker compose exec backend npm run db:migrate

# 4. Seed initial data (optional)
sqlite3 data/sqlite/arca.db < scripts/seed-bootstrap.sql

# 5. Access the application
# Frontend: http://localhost
# Backend API: http://localhost:3000
```

## Dashboard Overview

The Dashboard tab provides a high-level overview of your Arca instance:

- **Live Summary:** Shows counts of contacts, invoices, projects, and tasks
- **Recent Contacts:** Last 6 contacts created
- **Recent Invoices:** Last 6 invoices with status and amounts
- **Quick Actions:** Direct links to create contacts, post payments, create projects, or upload documents
- **Agent Tasks:** Create and manage AI agent tasks
- **Realtime Feed:** Live event stream showing system activity

**Key Metrics Displayed:**
- Contacts count (from contacts API)
- Invoices count (from finance API) 
- Projects count (from projects API)
- Tasks count (agent queue)
- Open receivables amount

## Contacts Module

### Purpose
Manage business contacts (debtors and creditors) with complete contact information, payment terms, and accounting details.

### Key Actions
1. **List Contacts:** View all contacts with filtering by type (debtor/creditor)
2. **Create Contact:** Add new contacts with name, company, email, phone, and JSON metadata
3. **Filter Contacts:** Switch between "All", "Debtors", or "Creditors" views

### Expected Behavior
- Contacts appear immediately in the list after creation
- All contact fields are editable via JSON in the creation form
- Contact numbers are auto-generated (CONT-001, CONT-002, etc.)
- Contacts can be linked to invoices, payments, and projects

### Form Fields:
- **Type:** `debtor` or `creditor`
- **Name:** Required, contact name
- **Company:** Optional company name
- **Email:** Optional email address
- **Phone:** Optional phone number
- **Address JSON:** JSON object for address details
- **Payment Terms JSON:** JSON for payment terms configuration
- **Accounting JSON:** JSON for accounting-specific metadata

## Finance Module

### Purpose
Complete financial management including invoices, payments, journal entries, and financial reports with spend approval workflows.

### Key Actions

#### **Invoices**
1. **Create Invoice:** Generate invoices with subtotal, tax rate, and due dates
2. **List Invoices:** View all invoices with status, amounts, and due dates
3. **Automatic Approval:** Invoices over threshold ($100 by default) require approval

#### **Payments**
1. **Post Payment:** Record customer payments with optional invoice linking
2. **List Payments:** View payment history with amounts and dates
3. **Approval Workflow:** Payments may require approval based on amount

#### **Journal Entries**
1. **Create Journal Entry:** Post double-entry accounting transactions
2. **List Journal Entries:** View all journal entries with debit/credit accounts
3. **Manual Approval:** Journal entries always require manual approval

#### **Financial Reports**
- **P&L Report:** Profit and Loss statement
- **VAT Report:** Value Added Tax reporting
- **Open A/R Report:** Open accounts receivable aging

#### **Waiting Approvals**
- **View Queue:** See all finance tasks waiting for approval
- **Approve/Reject:** Single-click approval or rejection with reason
- **Auto-Refresh:** Queue updates automatically via realtime events

### Expected Behavior
- Financial transactions create immutable records in `transaction_log`
- Approval-required operations create tasks in `waiting_approval` status
- Approved tasks resume execution automatically
- All financial data appears in realtime reports
- Socket.IO events notify of financial activity

### Form Fields (Invoice):
- **Contact ID:** Required, numeric contact identifier
- **Issue Date:** Invoice issue date (defaults to today)
- **Due Date:** Payment due date
- **Subtotal:** Net amount before tax
- **Tax Rate:** VAT/tax percentage (default 19%)
- **Description:** Optional invoice description

## Projects Module

### Purpose
Manage projects, sprints, and user stories with token-based estimation and budgeting for AI agent development work.

### Key Actions

#### **Projects**
1. **Create Project:** Start new projects with methodology (Scrum/Kanban), status, and token budget
2. **List Projects:** View all projects with status and methodology
3. **Select Project:** Choose active project for sprint/story management

#### **Sprints**
1. **Create Sprint:** Add sprints to selected projects with goals and budgets
2. **List Sprints:** View all sprints for current project
3. **Select Sprint:** Choose active sprint for story management

#### **User Stories**
1. **Create Story:** Add user stories with title, description, acceptance criteria, and token estimates
2. **List Stories:** View stories filtered by selected sprint
3. **Token Estimation:** Estimate story complexity in tokens (not story points)

#### **Sequential Workflow**
- **One-Click Demo:** Automatically creates project → sprint → story in sequence
- **Linked IDs:** Each created entity references the previous one
- **Guided Navigation:** UI automatically navigates to show created items

### Expected Behavior
- Projects have auto-generated project numbers (PROJ-001, etc.)
- Sprints belong to specific projects
- Stories can be assigned to sprints or remain in backlog
- Token estimates are used for sprint budgeting and velocity tracking
- Burndown and budget endpoints provide project analytics

### Form Fields (Project):
- **Name:** Required project name
- **Code:** Optional project code
- **Methodology:** Scrum or Kanban (default: Scrum)
- **Status:** Planned, Active, Completed, On Hold
- **Token Budget:** Optional total token budget for project
- **Client Contact ID:** Optional linked contact
- **Start/End Dates:** Project timeline
- **Notes:** Optional project notes

## Documents Module

### Purpose
Attach and manage documents linked to any Arca record (contacts, invoices, projects, etc.) with Nextcloud integration or local fallback storage.

### Key Actions
1. **Select Record:** Choose record type (contacts, invoices, projects, etc.) and record ID
2. **List Documents:** View all documents attached to selected record
3. **Upload Document:** Attach new documents with filename, MIME type, and content
4. **Delete Document:** Remove documents from storage

### Storage Modes
- **Nextcloud:** Documents stored in configured Nextcloud instance (if available)
- **Local Fallback:** Documents stored locally in `data/uploads/` when Nextcloud is unavailable
- **Auto-Detection:** System automatically chooses storage mode based on configuration

### Expected Behavior
- Document metadata shows storage mode (Nextcloud vs local)
- Uploads include content validation and MIME type detection
- Documents are permanently linked to their parent records
- Delete operations remove both metadata and storage content
- Storage mode is visible in document list for transparency

### Form Fields:
- **Record Type:** Type of record to attach to (contacts, invoices, projects, etc.)
- **Record ID:** Numeric ID of the specific record
- **Filename:** Required document filename
- **MIME Type:** Document type (application/pdf, image/png, etc.)
- **Content:** Document content (text or base64-encoded binary)
- **Metadata JSON:** Optional JSON metadata for the document

## Demo Walkthrough

### Scenario: Onboard New Customer and Invoice

Follow this realistic workflow to experience Arca's capabilities:

#### Step 1: Login
1. Navigate to `http://localhost`
2. Enter `admin@arca.local` / `admin1234`
3. Observe the JWT token being stored for API calls

#### Step 2: Create Customer Contact
1. Go to **Contacts** tab
2. Fill in the form:
   - Type: `debtor`
   - Name: `Acme Corporation`
   - Company: `Acme Corp Ltd`
   - Email: `billing@acmecorp.com`
   - Phone: `+1-555-ACME-123`
3. Click "Create contact"
4. Verify contact appears in list with ID (e.g., CONT-002)

#### Step 3: Create Invoice
1. Go to **Finance** tab  
2. Use the contact ID from Step 2
3. Fill invoice form:
   - Contact ID: `[ID from Step 2]`
   - Issue Date: Today
   - Due Date: 30 days from today
   - Subtotal: `5000`
   - Tax Rate: `19`
   - Description: `Q1 Consulting Services`
4. Click "Create invoice"
5. **Note:** If amount exceeds approval threshold, task goes to "Waiting approvals"

#### Step 4: Approve Invoice (if required)
1. Check **Waiting approvals** section in Finance tab
2. Find the invoice task
3. Click "Approve" with reason "Standard consulting invoice"
4. Observe task status changes and invoice appears in list

#### Step 5: Create Project for Customer
1. Go to **Projects** tab
2. Create project:
   - Name: `Acme Website Redesign`
   - Methodology: `scrum`
   - Status: `active`
   - Client Contact ID: `[ID from Step 2]`
3. Click "Create project"
4. Note the auto-generated project number (e.g., PROJ-001)

#### Step 6: Add Sprint and Story
1. With project selected, create sprint:
   - Name: `Sprint 1 - Discovery`
   - Goal: `Requirements gathering and design`
2. With sprint selected, create story:
   - Title: `User research and personas`
   - Description: `Conduct interviews and create user personas`
   - Estimate Tokens: `150000`
3. Use **Sequential Workflow** button for automated demo

#### Step 7: Attach Document
1. Go to **Documents** tab
2. Select record:
   - Record Type: `contacts`
   - Record ID: `[Customer ID from Step 2]`
3. Upload document:
   - Filename: `contract-acme-2025.pdf`
   - MIME Type: `application/pdf`
   - Content: `Base64 PDF content or text`
4. Verify document appears with storage mode indicator

#### Step 8: Monitor Dashboard
1. Return to **Dashboard**
2. Observe updated metrics:
   - Contacts: +1
   - Invoices: +1 (with open receivable)
   - Projects: +1
3. Check realtime feed for system events
4. Use quick actions for next steps

## Key Concepts

### Token Economy
- **Token Estimates:** Replace story points for AI agent work
- **Sprint Budgets:** Set in tokens (e.g., 2,400,000 tokens ≈ $8.50)
- **Velocity Tracking:** Token completion rate over time
- **Cost Awareness:** Token usage maps directly to LLM API costs

### Audit Compliance
- **Immutable Logs:** `transaction_log` and `system_log` cannot be modified
- **Hash Chaining:** Each log entry includes hash of previous entry
- **Verification:** CLI tool to verify log integrity
- **Financial Integrity:** All money movements are permanently recorded

### Realtime Events
- **Socket.IO Feed:** Live event stream in Dashboard
- **Event Types:** `finance.*`, `agent.task.*`, `project.*`, `document.*`
- **Auto-Refresh:** UI components update on relevant events
- **Notification:** Toast notifications for important events

### Multi-LLM Routing
- **Provider Abstraction:** Support for Anthropic, OpenAI, Groq, Ollama, LM Studio
- **Auto-Routing:** Confidential data → local models, complex reasoning → cloud models
- **Cost Thresholds:** Route to cheaper providers when appropriate
- **Fallback Chains:** Automatic provider fallback on failure

## Troubleshooting

### Common Issues

1. **"Invalid credentials" on login**
   - Verify `.env` has correct `BOOTSTRAP_ADMIN_*` values
   - Check database contains admin user (auto-created on first API call)
   - Ensure migrations have run: `docker compose exec backend npm run db:migration:status`

2. **Documents not uploading to Nextcloud**
   - Verify `NEXTCLOUD_*` environment variables are set
   - Check Nextcloud instance is accessible from Arca backend
   - System falls back to local storage if Nextcloud unavailable

3. **Finance tasks stuck in "waiting_approval"**
   - Check approval rules in `scripts/seed-spend-approval.sql`
   - Use admin account to approve tasks
   - Verify approver key exists and has correct permissions

4. **Realtime events not appearing**
   - Check Socket.IO connection status in sidebar (should show "connected")
   - Verify backend is running with Socket.IO enabled
   - Check browser console for WebSocket errors

5. **Database migration warnings**
   - Always use canonical DB path: `data/sqlite/arca.db`
   - Run migrations from within container: `docker compose exec backend npm run db:migrate`
   - Backup before migrations: `cp data/sqlite/arca.db data/backups/arca_pre_migrate_$(date +%Y%m%d_%H%M%S).db`

### Verification Commands

```bash
# Verify system health
./scripts/smoke-test.sh

# Check audit log integrity
docker compose exec backend npm run audit:verify -- --table transaction_log

# View migration status
docker compose exec backend npm run db:migration:status

# Reset database (with backup)
./scripts/reset-db.sh
```

## For AI Agents

### API Access Pattern
```javascript
// 1. Authenticate with agent key
const token = "erp_agent_sk_ak_...";

// 2. Create natural language task
const response = await fetch("http://localhost:3000/api/v1/agents/nl", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    instruction: "Close Q1 books and upload board pack to Nextcloud."
  })
});

// 3. Poll for completion
const taskId = response.json().task_id;
const task = await fetch(`http://localhost:3000/api/v1/agents/tasks/${taskId}`, {
  headers: { "Authorization": `Bearer ${token}` }
});

// 4. Handle approval if required
if (task.status === "waiting_approval") {
  // Task requires human approval
  // Monitor or notify human approver
}
```

### Key Endpoints for Agents
- `POST /api/v1/agents/nl` - Natural language task creation
- `GET /api/v1/agents/tasks` - List and poll tasks
- `POST /api/v1/agents/tasks/{id}/approve` - Approve/reject tasks
- `GET /api/v1/contacts` - List contacts
- `POST /api/v1/invoices` - Create invoices (may require approval)
- `POST /api/v1/projects` - Create projects
- `POST /api/v1/documents/upload` - Upload documents

### Best Practices
1. **Check approval thresholds** before financial operations
2. **Use token estimates** for project planning
3. **Monitor realtime events** for system state changes
4. **Respect immutable logs** - financial posts cannot be undone
5. **Handle fallback storage** for document operations

---

*This guide covers Arca v1 as verified on 2026-04-13. For the latest updates, check `README.md`, `V1_SCOPE_FREEZE.md`, and `PROJECT_PLAN.md` in the repository root.*