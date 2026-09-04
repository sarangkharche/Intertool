interface ApiErrorBody {
  error?: {
    message?: string;
    fields?: Array<{ message?: string }>;
  };
}

export function apiErrorMessage(
  body: ApiErrorBody | null,
  fallback: string
): string {
  return body?.error?.fields?.[0]?.message ?? body?.error?.message ?? fallback;
}
