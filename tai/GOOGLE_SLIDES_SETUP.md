# Google Slides API Integration Setup

This implementation provides complete Google Slides API integration with OAuth2 authentication, PostgreSQL storage, and Google Cloud Storage.

## Prerequisites

1. **Google Cloud Console Setup**
   - Create a project in [Google Cloud Console](https://console.cloud.google.com)
   - Enable the Google Slides API and Google Drive API
   - Create OAuth 2.0 credentials (Web application)
   - Create a Service Account for Google Cloud Storage
   - Download the service account key file

2. **Database Setup**
   - PostgreSQL database (local or cloud)
   - Run the schema migration: `psql -d your_database < database/schema.sql`

3. **Google Cloud Storage**
   - Create a GCS bucket for storing slide content
   - Set appropriate permissions

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in these values:

```bash
# Google OAuth2 Configuration
GOOGLE_CLIENT_ID=your_oauth_client_id
GOOGLE_CLIENT_SECRET=your_oauth_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=generate_a_random_secret

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_CLOUD_STORAGE_BUCKET=your_bucket_name
GOOGLE_APPLICATION_CREDENTIALS=./path/to/service-account-key.json

# PostgreSQL Database
DATABASE_URL=postgresql://username:password@localhost:5432/slides_db
```

## OAuth 2.0 Setup

1. **Google Cloud Console**:
   - Go to APIs & Services → Credentials
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `https://yourdomain.com/api/auth/callback/google` (production)

2. **Required Scopes**:
   - `https://www.googleapis.com/auth/presentations.readonly`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `openid`
   - `email`
   - `profile`

## Database Migration

Run the SQL schema:

```bash
# Local PostgreSQL
psql -U username -d slides_db -f database/schema.sql

# Or using a database client
# Execute the contents of database/schema.sql
```

## Usage

1. **User Authentication**:
   ```typescript
   import { signIn, signOut, useSession } from "next-auth/react"
   
   // Sign in with Google
   await signIn('google')
   
   // Check session
   const { data: session } = useSession()
   ```

2. **Import Google Slides**:
   ```typescript
   const response = await fetch('/api/slides/import/google', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       presentationId: 'your_slides_id',
       url: 'https://docs.google.com/presentation/d/your_slides_id/edit'
     })
   })
   
   const result = await response.json()
   ```

## API Response Format

```typescript
{
  id: string,              // Presentation ID
  title: string,           // Presentation title
  slideCount: number,      // Number of slides
  source: "google-slides", // Source type
  status: "completed",     // Import status
  slides: [                // Slide summaries
    {
      slideId: string,
      title: string,
      thumbnailUrl: string
    }
  ],
  message: string         // Status message
}
```

## Architecture

1. **Authentication Flow**:
   - NextAuth.js handles OAuth2 with Google
   - Access tokens are stored in JWT sessions
   - Automatic token refresh when expired

2. **Data Processing**:
   - Google Slides API extracts presentation data
   - Slide content stored in Google Cloud Storage
   - Metadata stored in PostgreSQL
   - Thumbnails processed and stored

3. **Storage Structure**:
   ```
   GCS Bucket:
   presentations/
     {presentationId}/
       metadata.json
       slides/
         {slideId}/
           content.json
       thumbnails/
         {slideId}.png
   
   PostgreSQL:
   - presentations (metadata)
   - slides (slide records)
   - slide_elements (detailed content)
   - user_sessions (OAuth tokens)
   ```

## Error Handling

The implementation includes comprehensive error handling:
- OAuth token validation and refresh
- Google API rate limiting
- Database transaction rollbacks
- Partial import recovery
- Detailed error logging

## Security Features

- OAuth 2.0 with proper scopes
- JWT session management
- Database parameterized queries
- GCS signed URLs for secure access
- Environment variable validation

## Testing

Run the test suite:
```bash
pnpm test              # Run all tests
pnpm test:watch        # Watch mode
pnpm test:coverage     # Coverage report
```

## Production Deployment

1. Set production environment variables
2. Use managed PostgreSQL (AWS RDS, GCP Cloud SQL)
3. Configure GCS with proper IAM roles
4. Set up monitoring and logging
5. Enable HTTPS for OAuth callbacks