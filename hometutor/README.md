# HomeTutor

Connects parents with home tutors (Class 1–12 and exam prep), starting in Pune. Next.js 15 + Supabase.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # then fill in the Supabase values
npx supabase start                 # optional: local Supabase (needs Docker); prints URL and keys
npm run dev                        # http://localhost:3000
```

Checks: `npm run lint` and `npm run build`.
Migrations live in `supabase/`; create one with `npx supabase migration new <name>`.

### Making the first admin

Sign up normally (admin can never be chosen at sign-up), then run this in the Supabase SQL editor:

```sql
update profiles set role = 'admin' where id = (select id from auth.users where email = '<your email>');
```

Log out and back in. Admins use `/api/admin/*` to approve tutors and add the Verified badge.

### Database without Docker (hosted project)

Put the Session pooler connection string in `.env.local` as `SUPABASE_DB_URL`, then:

```bash
set -a; . ./.env.local; set +a
npx supabase db push --remote="$SUPABASE_DB_URL"                 # apply new migrations
npx supabase db push --include-seed --remote="$SUPABASE_DB_URL"  # first time only: also load seed.sql
npx supabase db advisors --remote="$SUPABASE_DB_URL" --type security
```

`supabase test db` needs Docker (it runs pg_prove in a container). With Docker: `npx supabase test db --remote="$SUPABASE_DB_URL"`.
Never run `supabase db reset --remote` once the project has real data: it wipes the database.
