import { useState } from 'react'
import { Check, FileUp, Send, Loader2 } from 'lucide-react'
import { initialPlacementUpdateRequests } from '../../data/platformData'

export function StudentPlacementUpdatesPage() {
  const [requests, setRequests] = useState(initialPlacementUpdateRequests)
  const [company, setCompany] = useState('')
  const [packageLpa, setPackageLpa] = useState('')
  const [offerLetter, setOfferLetter] = useState('No file selected')
  const [uploading, setUploading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    const formData = new FormData()
    formData.append('resume', file) // backend expects single field named 'resume'

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setOfferLetter(data.fileUrl)
      } else {
        alert(data.error || 'Failed to upload offer letter.')
      }
    } catch (err) {
      console.error(err)
      alert('Network error while uploading offer letter.')
    } finally {
      setUploading(false)
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!company || !packageLpa || offerLetter === 'No file selected' || uploading) return

    const newRequest = {
      id: `REQ-00${requests.length + 1}`,
      company,
      packageLpa: `Rs. ${packageLpa} LPA`,
      offerLetter,
      submittedAt: new Date().toLocaleString(),
      status: 'Pending' as const,
      source: 'Student Self-Declaration' as const,
    }

    setRequests((current) => [newRequest, ...current])
    setCompany('')
    setPackageLpa('')
    setOfferLetter('No file selected')
    setSubmitted(true)
    window.setTimeout(() => setSubmitted(false), 2500)
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Placement Updates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Submit self-declared offers with an offer letter. Admin approval updates the official placement records.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card-surface p-5 md:p-6 lg:col-span-1">
          <h2 className="mb-4 text-lg font-semibold">Submit new update</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Company</label>
              <input
                type="text"
                value={company}
                onChange={(event) => setCompany(event.target.value)}
                placeholder="e.g. Capgemini"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Package (LPA)</label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={packageLpa}
                onChange={(event) => setPackageLpa(event.target.value)}
                placeholder="e.g. 7.2"
                className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase text-muted-foreground">Offer Letter</label>
               <label className="mt-1 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm hover:bg-muted/30">
                {uploading ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin" />
                ) : (
                  <FileUp className="h-4 w-4 text-primary" />
                )}
                <span className="flex-1 truncate">
                  {uploading ? 'Uploading offer letter...' : offerLetter}
                </span>
                <input
                  type="file"
                  className="hidden"
                  disabled={uploading}
                  onChange={handleFileChange}
                />
              </label>
            </div>
            <button
              type="submit"
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-pop hover:opacity-95"
            >
              {submitted ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {submitted ? 'Submitted' : 'Send for approval'}
            </button>
          </form>
        </div>

        <div className="card-surface overflow-hidden lg:col-span-2">
          <div className="border-b border-border px-5 py-4 md:px-6">
            <h2 className="font-semibold">Submission history</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Request ID</th>
                  <th className="px-5 py-3 font-medium">Company</th>
                  <th className="px-5 py-3 font-medium">Package</th>
                  <th className="px-5 py-3 font-medium">Offer Letter</th>
                  <th className="px-5 py-3 font-medium">Submitted</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-3 font-mono text-xs">{request.id}</td>
                    <td className="px-5 py-3 font-medium">{request.company}</td>
                    <td className="px-5 py-3">{request.packageLpa}</td>
                    <td className="px-5 py-3 text-muted-foreground">{request.offerLetter}</td>
                    <td className="px-5 py-3 text-muted-foreground">{request.submittedAt}</td>
                    <td className="px-5 py-3">
                      <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-semibold text-warning-foreground">
                        {request.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
