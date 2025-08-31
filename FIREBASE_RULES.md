# Firestore security rules deployment

This repo includes a recommended `firestore.rules` to:
- Allow each signed-in user to read/create/update their own `users/{uid}` document
- Enforce a single superadmin by email (hard-coded in rules)
- Let admins/superadmin manage alerts and registered users

Update the hard-coded superadmin email in rules if needed:
- In `firestore.rules`, update the function `isSuperAdmin()` to your superadmin email
  Example: request.auth.token.email == 'adekastanley1@gmail.com'

How to deploy

1) Install Firebase CLI (if not installed)
   npm i -g firebase-tools

2) Login and select your project
   firebase login
   firebase use safemap-backend

3) Deploy rules
   firebase deploy --only firestore:rules

Notes
- The app also enforces a single superadmin via NEXT_PUBLIC_SUPERADMIN_EMAIL at runtime. Keep the rules’ superadmin email in sync with the env var.
- After deploying rules, users can read/write their own `users/{uid}` doc, admins/superadmin can write alerts/registered_users. This will resolve permission errors for create alert, alerts loading, and admin role management.

