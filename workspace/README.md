# ResearchMesh Workspace Service (code-server Deployment)

This directory provides the containerized browser IDE service for ResearchMesh using `code-server` with HTTPS termination and WebSocket upgrade support.

---

## 1. Architecture Overview

- **Code-Server Container**: Long-running VS Code browser IDE containing Python 3, Node.js 20, Git, and build tools.
- **Nginx Reverse Proxy**: Handles HTTPS/TLS termination and WebSocket protocol upgrades (`Upgrade $http_upgrade`, `Connection "upgrade"`) required by code-server's interactive CLI terminals.
- **Backend Authorization**: ResearchMesh protects the workspace gate via `/api/projects/[id]/workspace`. Unapproved users receive HTTP 403 Forbidden (`WORKSPACE LOCKED`).
- **Integrated Browser IDE**: ResearchMesh also includes a native, client-side browser IDE with file explorer, code editor, and interactive terminal that functions immediately out-of-the-box.

---

## 2. Environment Variables

Create `.env` in this directory or supply via container orchestration:

| Variable | Description | Example |
|---|---|---|
| `WORKSPACE_PASSWORD` | Access password required by code-server | `a_strong_random_secret_password` |
| `WORKSPACE_SUDO_PASSWORD` | Sudo password for terminal commands | `a_strong_root_password` |
| `BIND_ADDR` | Internal bind host & port | `0.0.0.0:8080` |

In ResearchMesh's main `.env.local` (or production environment):

| Variable | Description |
|---|---|
| `WORKSPACE_SERVICE_URL` | The public or internal URL where the proxy serves code-server (e.g., `https://workspace.researchmesh.org`) |

---

## 3. Deployment with Docker Compose

To start the workspace service locally or in production:

```bash
cd workspace
docker compose up -d --build
```

To view logs:
```bash
docker compose logs -f
```

To stop the service:
```bash
docker compose down
```

---

## 4. HTTPS & WebSocket Configuration

Code-server requires active WebSocket communication for:
- Language server protocol (autocomplete, linting)
- Interactive CLI terminal sessions (`bash`, `zsh`, `python`, `npm`)
- File change watcher events

In `nginx.conf`, WebSocket proxying is established via:
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

location / {
    proxy_pass http://code_server_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 86400;
}
```

---

## 5. Security Invariants

1. **Authentication Required**: Code-server is never run in `--auth none` mode in public environments.
2. **Access Control**: Active membership in the project is strictly validated server-side by ResearchMesh before unlocking access.
3. **No Confidential Data Leakage**: Workspace instances operate inside isolated container sandboxes.
