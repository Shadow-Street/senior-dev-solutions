---
name: sonarqube
description: Configure, run and remediate SonarQube Server / SonarQube Cloud analysis for this repo (sonar-project.properties, LCOV coverage import, CI job, quality gate). Use when setting up Sonar, triaging Sonar issues, or checking the quality gate.
---

Status: config prepared in `sonar-project.properties` and `.github/workflows/ci.yml` (job `sonarqube`, skipped unless `SONAR_TOKEN` secret exists). Project key/organization/host are TODO — never invent them.

## Activate (needs user)
1. Choose SonarQube Cloud (sonarcloud.io, free for public repos) or self-hosted Server.
2. Create the project, disable Automatic Analysis (coverage needs CI-based analysis).
3. Fill `sonar.projectKey` (+ `sonar.organization` for Cloud) in `sonar-project.properties`.
4. Add repo secrets `SONAR_TOKEN` (and `SONAR_HOST_URL` for Server).

## Coverage
Frontend: `npm run test:coverage` → `coverage/lcov.info`. Backend: `npm --prefix backend run test:coverage` → `backend/coverage/lcov.info`. Both listed in `sonar.javascript.lcov.reportPaths`. Coverage must be generated before the scanner step.

## Remediation workflow
Fetch issues for new code first (quality gate is "new code"); fix Bugs/Vulnerabilities → Security Hotspots review → Code smells in touched files. Never mark hotspots "safe" without a written justification. Never report the gate as passed without the actual Sonar result.
