import { readLinkError } from './auth.link-errors';

describe('readLinkError', () => {
  it('stays silent for an ordinary visit', () => {
    expect(readLinkError('')).toBeUndefined();
    expect(readLinkError('#access_token=abc&type=recovery')).toBeUndefined();
  });

  it('explains a link that was already opened once', () => {
    const hash = '#error=access_denied&error_code=otp_expired&error_description=Email+link';

    expect(readLinkError(hash)).toContain('abgelaufen');
  });

  it('prefers the specific reason over the category', () => {
    const specific = readLinkError('#error=access_denied&error_code=otp_expired');
    const category = readLinkError('#error=access_denied');

    expect(specific).not.toBe(category);
  });

  it('still says something when the reason is one we do not know', () => {
    expect(readLinkError('#error_code=some_future_code')).toContain('neuen an');
  });
});
