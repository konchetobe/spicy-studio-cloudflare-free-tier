export class HttpError extends Error {
  constructor(status, message, field = "") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.field = field;
  }
}

export function jsonError(error) {
  const status = error?.status || 500;
  return {
    status,
    body: {
      error: status >= 500 ? "Something went wrong." : error.message || "Request failed.",
      field: error.field || undefined,
    },
  };
}
