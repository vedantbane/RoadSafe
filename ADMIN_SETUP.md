# Admin setup

This repository currently uses MongoDB through Mongoose (`MONGODB_URI`), not Neon/PostgreSQL. Therefore no Neon SQL migration applies to this codebase.

## Required environment variable

Set `AUTH_TOKEN_SECRET` in the deployment environment to a unique random string of at least 32 characters. The application refuses to authenticate users without it.

## Existing data migration

Run this once in `mongosh` against the database used by `MONGODB_URI`. It preserves all reports and gives legacy records the new default status.

```javascript
db.reports.updateMany(
  { $or: [{ status: { $exists: false } }, { status: { $in: ['reported', 'progress', 'fixed'] } }] },
  [{ $set: { status: { $switch: { branches: [
    { case: { $eq: ['$status', 'progress'] }, then: 'In Progress' },
    { case: { $eq: ['$status', 'fixed'] }, then: 'Resolved' }
  ], default: 'Pending' } } } }]
)
```

## Promote the first administrator

Register the account normally, then run the following query in `mongosh`. Do not expose this through the frontend.

```javascript
db.users.updateOne(
  { email: 'MY_ADMIN_EMAIL'.toLowerCase() },
  { $set: { role: 'admin' } }
)
```

Sign out and sign back in after promotion so the account navigation refreshes. Authorization still reads the current role from the database on every protected request, so a manually changed role takes effect immediately for the API.
