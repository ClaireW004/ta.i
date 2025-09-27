import { SlideImporter } from "@/components/slide-importer"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4">Presenter Assist</h1>
            <p className="text-lg text-muted-foreground">
              Import your slides to get started with AI-powered presentation assistance
            </p>
          </div>

          <SlideImporter />
        </div>
      </div>
    </main>
  )
}
