'use client'

import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-4 flex items-center gap-3">
        <div className="h-7 w-7 rounded bg-indigo-600 flex items-center justify-center shrink-0">
          <span className="text-[11px] font-bold text-white">C</span>
        </div>
        <div>
          <span className="text-[15px] font-semibold text-zinc-900">CaseTrack API</span>
          <span className="ml-2 text-[12px] text-zinc-400">v1.0.0 · 39 endpoints · OpenAPI 3.0</span>
        </div>
      </div>
      <SwaggerUI
        url="/api/docs"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        displayRequestDuration
        tryItOutEnabled={false}
        filter
      />
    </div>
  )
}
