import { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email", 
            "profile",
            "https://www.googleapis.com/auth/presentations.readonly",
            "https://www.googleapis.com/auth/drive.readonly"
          ].join(" "),
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token and refresh_token to the token right after signin
      if (account) {
        console.log("✅ Account received in JWT callback:", {
          provider: account.provider,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          expiresAt: account.expires_at
        })
        
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.accessTokenExpires = account.expires_at
      }

      // Check if we have a refresh token, if not, force re-authentication
      if (!token.refreshToken) {
        console.log("❌ No refresh token available - forcing re-authentication")
        return {
          ...token,
          error: "NoRefreshToken",
          accessToken: null,
        }
      }

      // Return previous token if the access token has not expired yet
      const now = Date.now()
      const expiresAt = (token.accessTokenExpires as number) * 1000
      
      if (now < expiresAt) {
        console.log("✅ Access token still valid")
        return token
      }

      // Access token has expired, try to update it
      console.log("⚠️ Access token expired, refreshing...")
      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      // If token is null, session is already invalid
      if (!token) {
        console.log('🔄 Token is null - session invalid')
        return session
      }

      // Send properties to the client
      session.accessToken = token.accessToken as string
      session.error = token.error as string
      
      console.log("✅ Session callback:", {
        userEmail: session.user?.email,
        hasAccessToken: !!session.accessToken,
        hasError: !!session.error,
        errorType: token.error
      })
      
      return session
    },
  },
  pages: {
    error: '/auth/error',
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
}

async function refreshAccessToken(token: any) {
  try {
    console.log("🔄 Attempting to refresh access token...")
    
    if (!token.refreshToken) {
      console.error("❌ No refresh token available")
      return {
        ...token,
        error: "NoRefreshToken",
        accessToken: null,
      }
    }

    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
      refresh_token: token.refreshToken,
    })

    const response = await fetch("https://oauth2.googleapis.com/token", {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      method: "POST",
      body: params,
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      console.error("❌ Token refresh failed:", {
        status: response.status,
        error: refreshedTokens.error,
        description: refreshedTokens.error_description
      })
      
      // If refresh token is invalid, force re-authentication
      if (refreshedTokens.error === 'invalid_grant') {
        console.log("🔄 Refresh token invalid - user needs to re-authenticate")
        return {
          ...token,
          error: "RefreshTokenExpired",
          accessToken: null,
          refreshToken: null,
        }
      }
      
      throw refreshedTokens
    }

    console.log("✅ Token refreshed successfully")
    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Math.floor(Date.now() / 1000) + refreshedTokens.expires_in,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
      error: undefined, // Clear any previous errors
    }
  } catch (error) {
    console.error("❌ Error refreshing access token:", error)
    return {
      ...token,
      error: "RefreshAccessTokenError",
      accessToken: null,
    }
  }
}