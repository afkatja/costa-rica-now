import { useTranslations } from "next-intl"
import { ChatInterface } from "../../components/ChatInterface"

export default function App() {
  const t = useTranslations("HomePage")
  return (
    <>
      <h1 className="text-4xl font-black">{t("title")}</h1>
      <ChatInterface />
    </>
  )
}
