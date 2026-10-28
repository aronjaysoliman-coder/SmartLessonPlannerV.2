/**
 * Module 6.6 — Display understandable, user-friendly error messages without
 * exposing raw technical/programming errors to the user.
 *
 * Every place in the app that catches an error should run it through
 * `friendlyMessage()` before showing it, instead of showing `error.message`
 * directly.
 */

export type ErrorContext =
  | "auth"
  | "login"
  | "register"
  | "save"
  | "pdf"
  | "share"
  | "load"
  | "delete"
  | "generic";

const CONTEXT_FALLBACKS: Record<ErrorContext, string> = {
  auth: "We couldn\u2019t sign you in. Please check your details and try again.",
  login:
    "We couldn\u2019t log in. Check your email and password, then try again.",
  register:
    "We couldn\u2019t create your account. Check your details and try again.",
  save: "We couldn\u2019t save your lesson plan. Please try again.",
  pdf: "We couldn\u2019t create the PDF. Please review your lesson plan and try again.",
  share: "We couldn\u2019t open the share menu on this device.",
  load: "We couldn\u2019t load your lesson plans right now.",
  delete: "We couldn\u2019t delete this lesson plan. Please try again.",
  generic: "Something went wrong. Please try again.",
};

export function friendlyMessage(
  err: unknown,
  context: ErrorContext = "generic",
): string {
  if (err instanceof Error) {
    if ("status" in err && typeof err.status === "number") return err.message;
    if (
      err instanceof TypeError ||
      /network|fetch failed|failed to fetch/i.test(err.message)
    ) {
      return "Could not reach the MongoDB API. Check that the server is running and try again.";
    }
  }
  return CONTEXT_FALLBACKS[context];
}
