/**
 * The ids that tie a field's hint and error line to its input. Shared so the shell and the input
 * that sits inside it cannot drift apart — a mismatch here breaks aria-describedby silently.
 */
export function fieldHintId(fieldId: string): string {
  return `${fieldId}-hint`;
}

export function fieldErrorId(fieldId: string): string {
  return `${fieldId}-error`;
}

/**
 * The error line is always referenced, even while empty: if the text appears later, the screen
 * reader then announces it by itself.
 */
export function fieldDescribedBy(fieldId: string, hasHint: boolean): string {
  const ids = hasHint ? [fieldHintId(fieldId)] : [];
  ids.push(fieldErrorId(fieldId));

  return ids.join(' ');
}
