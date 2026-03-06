# Hosting

## VPS Server

Get a hosting with 16Gb RAM. Can be [Hertzer](https://hetzner.com) for example.  
Get the IP address.

## Dockploy

Deploy the stable version of [Dockploy](https://docs.dokploy.com/docs/core/installation#advanced-installation-options)
for app management

# Get domain name and https certificate

## Domain name

[FreeDomain](https://freedomain.one/) is one of the options to get the domain name. We also need two entry points for
the application. Open the DNS settings and add two records:

| Record type | Prefix            | Target                | Why               |
| ----------- | ----------------- | --------------------- | ----------------- |
| A           | app.domain.name   | vps.server.ip.address | Main app endpoint |
| A           | panel.domain.name | vps.server.ip.address | Cluster panel     |

PRESS SAVE ON TOP OF THE PAGE

## SSL Connection

- Go to http://vps.server.ip.address:3000 first and create a user.
- Open Settings -> Web Server

1. Domain: panel.domain.name
2. Let's Encrypt email: some_email
3. Auto-https: Yes
4. Provider: Let's encrypt
5. Save

If the panel does not open, test the new urls:

- https://dnschecker.org/#A/app.domain.name
- https://developers.google.com/speed/public-dns/cache

# Project

## Core service

### General

Deploy from Docker

- Docker image: ghcr.io/n0th1ng-else/voice-to-text-bot/voice-to-speech-app:latest
- Docker registry: ghcr.io

### Domains

- Source: Docker
- Host: app.domain.name
- Container port: 3010
- HTTPS: Yes
- Certificate provider: Let's encrypt

## Advanced

Add healthcheck

- Cluster settings -> Swarm settings
- Test command: `["CMD-SHELL", "node -e \"fetch('http://localhost:3010/health').then(r => r.json()).then(j => process.exit(j.status === 'ONLINE' ? 0 : 1)).catch(() => process.exit(1))\""]`
- Interval: 60000000000 (1 minute)
- Timeout: 1000000000 (1 second)
- Start Period: 60000000000 (1 minute)
- Retries: 3

## VTT Service

### General

Deploy from Docker

- Source: Git
- Repository: https://github.com/n0th1ng-else/parakeet-tdt-0.6b-v3-fastapi-openai.git
- Branch: main
- Docker file: Dockerfile.cpu

## Advanced

Add replica

- Replicas: 2

Add volume

- Type: volume mount
- Volume name: parakeet-models
- Mount path: /app/models

### Find API endpoint

- Go to Swarm -> Services
- Find the new docker service by service name
- The name value is the internal `INTERNAL_URL`

### Connect with Core service

- Go to Core service
- Use `http://INTERNAL_URL:5092/v1/audio/transcriptions/transcribe` as a recognition url
