# ResearchMesh Code-Server Workspace Container
# Secure, isolated browser IDE service with Node.js, Python, Git & build tooling

FROM codercom/code-server:latest

USER root

# Install essential research build tools & runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    build-essential \
    python3 \
    python3-pip \
    python3-venv \
    ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create workspace directory structure
RUN mkdir -p /home/coder/projects && \
    chown -R coder:coder /home/coder/projects

USER coder
WORKDIR /home/coder/projects

# Default code-server configuration
ENV PASSWORD=researchmesh_secure_workspace_key
ENV BIND_ADDR=0.0.0.0:8080

EXPOSE 8080

ENTRYPOINT ["/usr/bin/entrypoint.sh", "--bind-addr", "0.0.0.0:8080", "--auth", "password", "/home/coder/projects"]
