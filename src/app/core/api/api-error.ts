import { HttpErrorResponse } from '@angular/common/http';

export type ApiErrorKind =
  | 'validation'
  | 'unauthorized'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'locked'
  | 'rateLimited'
  | 'network'
  | 'server';

export interface FieldError {
  path: string;
  message: string;
}

/** Normalized error: `message` is always safe to show to the user, with no internal details. */
export class ApiError {
  constructor(
    readonly kind: ApiErrorKind,
    readonly status: number,
    readonly message: string,
    readonly fieldErrors: FieldError[] = [],
  ) {}
}

const DEFAULT_MESSAGES: Record<ApiErrorKind, string> = {
  validation: 'Some of the data is invalid. Check the highlighted fields.',
  unauthorized: 'Your session has expired. Please sign in again.',
  forbidden: "You don't have permission to do this.",
  notFound: 'The requested item does not exist or has been deleted.',
  conflict: "This action isn't possible in the current state of the data.",
  locked: 'The account is temporarily locked.',
  rateLimited: 'Too many requests. Wait a few minutes and try again.',
  network: "The server can't be reached. Check your connection and try again.",
  server: 'Something went wrong on the server. Please try again later.',
};

// Backend messages are written for developers (e.g. "Contact not found"); the ones users
// actually run into are rephrased here. Unknown messages fall back to the default for the kind.
const KNOWN_MESSAGES: ReadonlyArray<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
  [/^Invalid email or password$/, 'Incorrect email or password.'],
  [
    /locked/i,
    'The account is temporarily locked after too many failed attempts. Try again in 15 minutes.',
  ],
  [/^Invalid two-factor code$/, 'The code is incorrect. Check your authenticator app.'],
  [/temporary token/i, 'The sign-in has expired. Enter your email and password again.'],
  [/reset token/i, 'The password reset link is invalid or has expired. Request a new one.'],
  [/^An account with this email already exists$/, 'An account with this email already exists.'],
  [/must be a member of the workspace/, 'That person is not a member of this workspace.'],
  [/already a member/, 'This person is already a member of the workspace.'],
  [/invitation is no longer valid/, 'This invitation has expired or has already been used.'],
  [/sent to a different email/, 'This invitation was sent to a different email address.'],
  [/address the invitation was sent to/, 'Use the email address the invitation was sent to.'],
  [/owner.s role cannot be changed/, 'The owner’s role cannot be changed.'],
  [/owner cannot leave/, 'The owner cannot leave or be removed from the workspace.'],
  [/owners and admins/, 'Only workspace owners and admins can do this.'],
  [
    /reporter or a workspace admin/,
    'Only the person who created this task or an admin can delete it.',
  ],
  [/author or a workspace admin/, 'Only the author or an admin can delete this comment.'],
  [/target column/, 'The board changed in the meantime. Refresh and try again.'],
  [/subtask cannot have subtasks/, 'Subtasks cannot have subtasks of their own.'],
  [/already exists/, 'Something with this value already exists (for a project: the key is taken).'],
  [/referenced by other records/, "This can't be deleted because it is still in use."],
  [/^Too many/, DEFAULT_MESSAGES.rateLimited],
];

function kindFromStatus(status: number): ApiErrorKind {
  switch (status) {
    case 0:
      return 'network';
    case 400:
    case 413:
      return 'validation';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 423:
      return 'locked';
    case 429:
      return 'rateLimited';
    default:
      return 'server';
  }
}

function userMessage(backendMessage: unknown, kind: ApiErrorKind): string {
  if (typeof backendMessage === 'string' && kind !== 'server') {
    for (const [pattern, replacement] of KNOWN_MESSAGES) {
      const match = backendMessage.match(pattern);
      if (match) {
        return typeof replacement === 'string' ? replacement : replacement(match);
      }
    }
  }
  return DEFAULT_MESSAGES[kind];
}

function isFieldErrorList(value: unknown): value is FieldError[] {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item?.path === 'string' && typeof item?.message === 'string')
  );
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (!(error instanceof HttpErrorResponse)) {
    return new ApiError('server', -1, DEFAULT_MESSAGES.server);
  }

  const kind = kindFromStatus(error.status);
  const body: unknown = error.error;
  const backendMessage =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'error') : undefined;
  const details =
    typeof body === 'object' && body !== null ? Reflect.get(body, 'details') : undefined;

  return new ApiError(
    kind,
    error.status,
    userMessage(backendMessage, kind),
    isFieldErrorList(details) ? details : [],
  );
}
