## Quickstart

### Prerequisites

- **Docker + Docker Compose** (v2.0+ recommended)
- **Disk Space**: At least 2GB free space for Docker images and build cache
- **Ollama** running on your host ([install](https://ollama.com/download)) — optional but free
- A **Nextcloud instance** — optional, for document storage
- At least one **LLM API key** (Anthropic, OpenAI, or Groq)

### 1. Clone



### 2. Configure Environment



**Important Environment Variables:**
- : Secure random string for JWT token signing
- : Secure random string for agent key hashing
- : Default admin username (default: admin)
- : Default admin password (default: admin1234)
- : Default admin email (default: admin@arca.local)

### 3. Start Services



**Common Issues:**
- **Disk space**: If build fails with no space left on device, run 
- **Version warning**: Warning about  field in docker-compose.yml is safe to ignore

### 4. Run Database Migrations



**Migration Safety:** Arca uses SQLite. Always run migrations from within the container to ensure consistent DB path ().

### 5. Seed Initial Data (Optional)



All seed scripts are **idempotent** - safe to run multiple times.

### 6. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3000
- **Default Admin**:  / 

### 7. Run Smoke Test


