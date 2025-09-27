"use client"

import { useSession, signIn, signOut } from "next-auth/react"

export default function TestAuth() {
  const { data: session, status } = useSession()

  if (status === "loading") return <p>Loading...</p>

  if (session) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Signed in as {session.user?.email}</h1>
        <button 
          onClick={() => signOut()}
          className="bg-red-500 text-white px-4 py-2 rounded"
        >
          Sign out
        </button>
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <pre>{JSON.stringify(session, null, 2)}</pre>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Not signed in</h1>
      <button 
        onClick={() => signIn("google")}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Sign in with Google
      </button>
    </div>
  )
}