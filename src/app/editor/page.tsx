export default function EditorPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Story Editor</h1>
        <p className="text-center text-muted-foreground mb-8">
          Trim and layout your video for Instagram Stories
        </p>

        {/* Placeholder for editor functionality - will be implemented in Milestone 4 */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-card border rounded-lg p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Timeline and trimming tools coming in Milestone 4...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
