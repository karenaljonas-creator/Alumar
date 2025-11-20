"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/client"

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [dbConnected, setDbConnected] = useState(true)

  useEffect(() => {
    // Check browser connectivity
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Check database connectivity
    const checkDbConnection = async () => {
      try {
        const supabase = createClient()
        const { error } = await supabase.from("machines").select("count", { count: "exact", head: true })
        if (error) throw error
        setDbConnected(true)
      } catch (e) {
        console.error("Database connection failed:", e)
        setDbConnected(false)
      }
    }

    checkDbConnection()
    const interval = setInterval(checkDbConnection, 30000) // Check every 30s

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      clearInterval(interval)
    }
  }, [])

  if (isOnline && dbConnected) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md animate-in slide-in-from-bottom-5">
      <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800 shadow-lg">
        <WifiOff className="h-4 w-4" />
        <AlertTitle>Erro de Conexão</AlertTitle>
        <AlertDescription>
          {!isOnline
            ? "Seu dispositivo está sem internet."
            : "Não foi possível conectar ao servidor. Se você usa Zscaler ou VPN corporativa, eles podem estar bloqueando o acesso."}
        </AlertDescription>
      </Alert>
    </div>
  )
}
