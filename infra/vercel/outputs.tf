output "project_id" {
  description = "Vercel project ID."
  value       = vercel_project.techblo.id
}

output "production_url" {
  description = "Primary production URL."
  value       = "https://${var.project_name}.vercel.app"
}

