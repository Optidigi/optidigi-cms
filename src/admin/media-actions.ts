export async function deleteMedia(form: FormData): Promise<boolean> {
  const response = await fetch('/api/cms-admin/media/delete', { method: 'POST', body: form })
  return response.ok && (await response.json()) === true
}
