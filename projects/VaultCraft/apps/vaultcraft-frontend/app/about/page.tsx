import { redirect } from "next/navigation"

export default function AboutPage() {
  // Simple redirect to GitHub repo per request
  redirect("https://github.com/Wenbobobo/VaultCraft")
}

