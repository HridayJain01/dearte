# Backups

`.github/workflows/backup.yml` runs every night at 02:30 IST and copies three things
to a private Backblaze B2 bucket:

| Path in bucket | What | Kept |
|---|---|---|
| `daily/db-YYYY-MM-DD.archive.gz` | Full `mongodump` of Atlas | 30 days |
| `daily/code-YYYY-MM-DD.bundle` | Every branch and tag of this repo | 30 days |
| `daily/cloudinary-YYYY-MM-DD.json` | List of every Cloudinary image | 30 days |
| `monthly/…` | Copy of the db and code taken on the 1st | 1 year |
| `images/<public_id>.<ext>` | Every Cloudinary image ever uploaded | Forever (even after it's deleted in admin) |

Images are copied once. Each night only new ones are downloaded, at most 1,500 a
night (`MAX_IMAGE_DOWNLOADS`), so a large first copy spreads over a few nights
instead of using up Cloudinary bandwidth in one go.

Costs nothing at current size: B2 is free up to 10 GB, and Actions minutes are
free for public repos.

> **This repo is public.** The workflow logs can be read by anyone, which is why
> the workflow prints only counts and never uploads backups as artifacts. The
> backups hold customer names, addresses, orders and password hashes: the B2
> bucket must stay **private**.

## One-time setup

### 1. Backblaze B2
1. Create an account at backblaze.com (no card needed for the free 10 GB).
2. **Buckets → Create a Bucket**: Private, **Default Encryption: Enable**, Object Lock off.
3. On the bucket, **Lifecycle Settings → Use custom lifecycle rules**, add two rules:
   - File path `daily/`: hide after **30** days, delete **1** day after hiding.
   - File path `monthly/`: hide after **365** days, delete **1** day after hiding.
   - Leave `images/` with no rule.
4. **Application Keys → Add a New Application Key**: allow access to this bucket only,
   type **Read and Write**. Note the `keyID` and `applicationKey` (shown once).
5. Note the bucket's **Endpoint**, e.g. `s3.us-west-004.backblazeb2.com`.

### 2. Atlas read-only user
1. Atlas → **Database Access → Add New Database User**.
2. Password auth, built-in role **Only read any database**.
3. Build the URI from your normal connection string with this user's name and password:
   `mongodb+srv://backup-user:PASSWORD@cluster0.xxxxx.mongodb.net/`
4. **Network Access** must allow `0.0.0.0/0` (GitHub's runners have changing IPs).
   It already does if Vercel can reach the database.

### 3. GitHub secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Value |
|---|---|
| `MONGODB_BACKUP_URI` | The read-only URI from step 2 |
| `B2_BUCKET` | Bucket name |
| `B2_ENDPOINT` | `https://` + endpoint, e.g. `https://s3.us-west-004.backblazeb2.com` |
| `B2_KEY_ID` | B2 `keyID` |
| `B2_APPLICATION_KEY` | B2 `applicationKey` |
| `CLOUDINARY_CLOUD_NAME` | Same as in Vercel |
| `CLOUDINARY_API_KEY` | Same as in Vercel |
| `CLOUDINARY_API_SECRET` | Same as in Vercel |

### 4. First run
**Actions → Nightly backup → Run workflow**. When it's green, check the bucket has
files under `daily/` and `images/`.

GitHub emails you when a scheduled run fails.

**Public-repo catch:** GitHub pauses scheduled workflows after **60 days with no
commits**. If you stop committing for two months, open **Actions → Nightly backup**
and click **Enable workflow**.

## Restoring

Download the files from the B2 web UI (**Browse Files**), or with the AWS CLI using
the same key and endpoint.

**Practise this once a month on a local database.** Never restore into production
unless production is actually broken.

### Database
```bash
# Practice: into a local mongod (start one first, e.g. on port 27018)
mongorestore --uri "mongodb://127.0.0.1:27018" --gzip --archive=db-YYYY-MM-DD.archive.gz

# Real disaster: into Atlas, replacing what's there (needs a user with write access)
mongorestore --uri "mongodb+srv://admin-user:PASSWORD@cluster0.xxxxx.mongodb.net/" \
  --gzip --archive=db-YYYY-MM-DD.archive.gz --drop
```
`--drop` replaces each collection with the backup. Without it, mongorestore only
adds documents that are missing.

To bring back just one collection, e.g. products someone deleted by mistake:
```bash
mongorestore --uri "…" --gzip --archive=db-YYYY-MM-DD.archive.gz \
  --nsInclude 'dearte.products'
```

### Code
```bash
git clone code-YYYY-MM-DD.bundle dearte
```

### Images
Product and banner records store full Cloudinary URLs. If an image was deleted
from Cloudinary, re-upload the file from `images/` to the **same public_id** (the
path without the extension) and the old URL works again. In the Cloudinary web
UI, upload it to the same folder with the same name.
`cloudinary-YYYY-MM-DD.json` lists what existed on each night.

### The website itself
Vercel keeps every deployment: **Project → Deployments → … → Promote** on the
last good one rolls back in seconds.
