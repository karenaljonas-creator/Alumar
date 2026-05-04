"use client"

import { useEffect } from "react"

export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress benign network errors that show {"isTrusted":true}
    const handleError = (event: ErrorEvent) => {
      // Check if it's a network/WebSocket error
      if (event.message?.includes("isTrusted") || 
          (event.error && JSON.stringify(event.error) === '{"isTrusted":true}')) {
        event.preventDefault()
        return
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Suppress WebSocket/network related promise rejections
      const reason = event.reason
      if (reason && (
        JSON.stringify(reason) === '{"isTrusted":true}' ||
        reason?.message?.includes('WebSocket') ||
        reason?.message?.includes('network')
      )) {
        event.preventDefault()
        return
      }
    }

    window.addEventListener("error", handleError)
    window.addEventListener("unhandledrejection", handleUnhandledRejection)

    return () => {
      window.removeEventListener("error", handleError)
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
    }
  }, [])

  return null
}
