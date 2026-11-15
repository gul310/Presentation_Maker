# PresentMaker — Database Setup & Architecture

PresentMaker uses **MongoDB Atlas** (or a local MongoDB instance) with Mongoose as the Object Data Modeling (ODM) library in `backend-node`.

---

## 1. Database Connection Configuration

In `backend-node/.env`, set the `MONGODB_URI` environment variable:

```env
# MongoDB Atlas Connection URI:
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.example.mongodb.net/presentmaker?retryWrites=true&w=majority

# Or Local Development Instance:
# MONGODB_URI=mongodb://127.0.0.1:27017/presentmaker
```

> [!IMPORTANT]
> Never commit real database connection strings or passwords to Git. Each team member should connect to their own free MongoDB Atlas cluster or a local instance for development.

---

## 2. Collections & Schema Architecture

The database contains the following Mongoose models defined in `backend-node/src/models/`:

### 1. `User` (`users` collection)
Stores user credentials, role (`user` or `admin`), and freemium AI credit counters:
- `email`: String (Unique, Indexed)
- `password_hash`: String (bcrypt hash)
- `name`: String
- `role`: String (`user` or `admin`)
- `ai_credits`: `{ remaining: Number, used: Number, plan: String }`

### 2. `Presentation` (`presentations` collection)
Contains complete presentation decks, slide trees, visual layout definitions, and themes:
- `user_id`: ObjectId (Ref: `User`, Indexed for fast account-scoped queries)
- `guest_session_id`: String (Nullable, Indexed for unauthenticated guest flows)
- `title`: String
- `slides`: Array of `ISlide` objects:
  - `slide_number`: Number
  - `title`: String
  - `layout_type`: String (`two-column`, `cards-grid`, `timeline-vertical`, etc.)
  - `content`: Object with `subtitle`, `bullet_points`, `body`, `steps`, `stats`, `cards`, etc.
  - `speaker_notes`: String
  - `image_url` & `image_caption`: String (Unsplash integration)
- `theme`: Object with `primary_color`, `font_family`, `background_style`
- `visibility`: String (`private` or `public`)

### 3. `GenerationJob` (`generationjobs` collection)
Tracks asynchronous AI presentation generation status:
- `user_id` / `guest_session_id`: Owner references
- `status`: String (`pending`, `processing`, `completed`, `failed`)
- `progress_percent`: Number (0–100)
- `progress_stage`: String (`initializing`, `ai_generation`, `images`, `saving`, `completed`)
- `presentation_id`: ObjectId (Populated on completion)

### 4. `MarketplaceListing` & `MarketplaceOrder`
Powers the community template marketplace:
- `seller_id`: ObjectId (Ref: `User`)
- `presentation_id`: ObjectId (Ref: `Presentation`)
- `title`, `description`, `price`: Number (PKR)
- `category`: String
- `is_approved`: Boolean (Super admin moderation flag)

### 5. `PracticeSession` (`practicesessions` collection)
Stores rehearsal audio transcripts, pacing metrics (words per minute), and AI coaching feedback.

### 6. `AuditLog` (`auditlogs` collection)
Maintains an immutable security log of administrative actions, role modifications, and system events.

---

## 3. Safe Initial Setup & Admin Seeding

When the Node backend gateway starts for the first time, it connects to MongoDB via `backend-node/src/config/db.ts`. 

To create an initial admin account safely without writing raw records, the application includes a seed service at `backend-node/src/services/adminSeed.ts` that will seed a default administrative profile if none exists.

