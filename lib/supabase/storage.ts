import { supabaseAdmin } from './admin'

export async function uploadFile(file: File, bucket: string = 'uploads', path?: string) {
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
  const filePath = path ? `${path}/${fileName}` : fileName

  const { data, error } = await supabaseAdmin.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    throw error
  }

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from(bucket)
    .getPublicUrl(data.path)

  return {
    path: data.path,
    url: publicUrl,
  }
}

export async function deleteFile(path: string, bucket: string = 'uploads') {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove([path])

  if (error) {
    throw error
  }
}

export async function deleteFiles(paths: string[], bucket: string = 'uploads') {
  const { error } = await supabaseAdmin.storage
    .from(bucket)
    .remove(paths)

  if (error) {
    throw error
  }
}
