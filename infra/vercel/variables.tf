variable "vercel_team_id" {
  description = "Vercel team ID that owns the project."
  type        = string
  default     = "team_wnJZTfZNQmJ0s2srd9JQOoF2"
}

variable "project_name" {
  description = "Vercel project name."
  type        = string
  default     = "techblo"
}

variable "github_repository" {
  description = "GitHub repository connected to the Vercel project."
  type        = string
  default     = "iakito-dev/techblo"
}

variable "database_url" {
  description = "Production Neon database URL."
  type        = string
  sensitive   = true
}

variable "better_auth_secret" {
  description = "Better Auth production secret."
  type        = string
  sensitive   = true
}

variable "better_auth_url" {
  description = "Better Auth production base URL."
  type        = string
  default     = "https://techblo.vercel.app"
}

variable "google_client_id" {
  description = "Google OAuth client ID."
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret."
  type        = string
  sensitive   = true
}

variable "revalidate_secret" {
  description = "Shared secret protecting /api/revalidate (feed cache invalidation from the trigger.dev cron). Set the same value on trigger.dev."
  type        = string
  sensitive   = true
}

variable "gemini_api_key" {
  description = "Google Gemini API key for AI article summary generation."
  type        = string
  sensitive   = true
}

variable "ai_summary_model" {
  description = "Gemini model ID used for AI article summary generation."
  type        = string
  default     = "gemini-3.1-flash-lite"
}

variable "ai_summary_batch_limit" {
  description = "Maximum number of article summaries generated per Trigger.dev batch."
  type        = string
  default     = "10"
}

variable "node_env" {
  description = "Node environment for production deployments."
  type        = string
  default     = "production"
}

variable "next_public_posthog_host" {
  description = "PostHog host exposed to the browser."
  type        = string
  default     = "https://us.i.posthog.com"
}

# ===== Preview overrides =====
# Preview デプロイ用の env。未指定(null)なら production の値を流用する(locals.tf の coalesce)。
# プレビューで本番 DB を汚したくない等の場合に、個別に上書きする。

variable "database_url_preview" {
  description = "Preview database URL. Falls back to var.database_url when null."
  type        = string
  sensitive   = true
  default     = null
}

variable "better_auth_secret_preview" {
  description = "Preview Better Auth secret. Falls back to var.better_auth_secret when null."
  type        = string
  sensitive   = true
  default     = null
}

variable "better_auth_url_preview" {
  description = "Preview Better Auth base URL. Falls back to var.better_auth_url when null."
  type        = string
  default     = null
}

variable "google_client_id_preview" {
  description = "Preview Google OAuth client ID. Falls back to var.google_client_id when null."
  type        = string
  sensitive   = true
  default     = null
}

variable "google_client_secret_preview" {
  description = "Preview Google OAuth client secret. Falls back to var.google_client_secret when null."
  type        = string
  sensitive   = true
  default     = null
}

variable "revalidate_secret_preview" {
  description = "Preview revalidate secret. Falls back to var.revalidate_secret when null."
  type        = string
  sensitive   = true
  default     = null
}

variable "gemini_api_key_preview" {
  description = "Preview Gemini API key. Falls back to var.gemini_api_key when null."
  type        = string
  sensitive   = true
  default     = null
}
