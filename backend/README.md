# Backend Auth Example

Tech stack:
- Node.js
- Express
- MySQL
- Sequelize ORM
- JWT auth
- bcrypt / md5 password support

## Structure

- \`src/controllers/AuthController.js\` — contains login controller using your sample pattern
- \`src/services/AuthService.js\` — contains login logic, JWT, OAuthToken persistence
- \`src/models/User.js\`, \`src/models/Auth/OauthToken.js\` — Sequelize models
- \`src/routes/auth.routes.js\` — /api/auth/login route
- \`src/utils/validation.js\` — validateRequiredFields helper

## Quick start

1. Install dependencies:

   \`\`\`bash
   npm install
   \`\`\`

2. Copy \`.env.example\` to \`.env\` and fill DB + JWT values.

3. Run the server:

   \`\`\`bash
   npm run dev
   \`\`\`

POST \`/api/auth/login\` with:

\`\`\`json
{
  "email": "test@example.com",
  "password": "password123",
  "role": "user"
}
\`\`\`
