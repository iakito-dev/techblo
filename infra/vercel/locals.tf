locals {
  production_environment_variable_values = {
    NODE_ENV                 = var.node_env
    DATABASE_URL             = var.database_url
    BETTER_AUTH_SECRET       = var.better_auth_secret
    BETTER_AUTH_URL          = var.better_auth_url
    GOOGLE_CLIENT_ID         = var.google_client_id
    GOOGLE_CLIENT_SECRET     = var.google_client_secret
    REVALIDATE_SECRET        = var.revalidate_secret
    GEMINI_API_KEY           = var.gemini_api_key
    AI_SUMMARY_MODEL         = var.ai_summary_model
    AI_SUMMARY_BATCH_LIMIT   = var.ai_summary_batch_limit
    NEXT_PUBLIC_POSTHOG_HOST = var.next_public_posthog_host
  }

  production_environment_variable_sensitivity = {
    NODE_ENV                 = false
    DATABASE_URL             = true
    BETTER_AUTH_SECRET       = true
    BETTER_AUTH_URL          = false
    GOOGLE_CLIENT_ID         = false
    GOOGLE_CLIENT_SECRET     = true
    REVALIDATE_SECRET        = true
    GEMINI_API_KEY           = true
    AI_SUMMARY_MODEL         = false
    AI_SUMMARY_BATCH_LIMIT   = false
    NEXT_PUBLIC_POSTHOG_HOST = false
  }

  # Preview は production と同じキー構成。`*_preview` 変数が指定されていればそれを、
  # null なら production の値を流用する(coalesce)。これにより Preview デプロイの
  # 環境変数検証(lib/env.ts)が通る。
  preview_environment_variable_values = {
    NODE_ENV                 = var.node_env
    DATABASE_URL             = coalesce(var.database_url_preview, var.database_url)
    BETTER_AUTH_SECRET       = coalesce(var.better_auth_secret_preview, var.better_auth_secret)
    BETTER_AUTH_URL          = coalesce(var.better_auth_url_preview, var.better_auth_url)
    GOOGLE_CLIENT_ID         = coalesce(var.google_client_id_preview, var.google_client_id)
    GOOGLE_CLIENT_SECRET     = coalesce(var.google_client_secret_preview, var.google_client_secret)
    REVALIDATE_SECRET        = coalesce(var.revalidate_secret_preview, var.revalidate_secret)
    GEMINI_API_KEY           = coalesce(var.gemini_api_key_preview, var.gemini_api_key)
    AI_SUMMARY_MODEL         = var.ai_summary_model
    AI_SUMMARY_BATCH_LIMIT   = var.ai_summary_batch_limit
    NEXT_PUBLIC_POSTHOG_HOST = var.next_public_posthog_host
  }

  preview_environment_variable_sensitivity = local.production_environment_variable_sensitivity
}
