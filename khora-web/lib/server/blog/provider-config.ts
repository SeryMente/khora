// Server-only configuration. The public profile ID is NOT the Graph API Page ID.
// Both were linked by an authenticated Meta /me/accounts + Page /me read, then
// opening Meta's returned link redirected to the canonical public profile.
export const BLOG_META_API_PAGE_ID = '1354217727781437';
export const BLOG_META_PUBLIC_PROFILE_ID = '61595788700651';
type Environment = Readonly<Record<string, string | undefined>>;
type ConfiguredProviders = Environment & {
  BLOG_GITHUB_TOKEN: string;
  BLOG_META_PAGE_TOKEN: string;
  BLOG_META_PAGE_ID: typeof BLOG_META_API_PAGE_ID;
  BLOG_META_ADMIN_VERIFIED: '1';
};
// An explicit deployment attestation remains mandatory; discovery/name/URL alone
// never enables sends. No fallback between IDs and no network redirect trust.
export function blogProvidersConfigured(env: Environment): env is ConfiguredProviders {
  return Boolean(env.BLOG_GITHUB_TOKEN?.trim() && env.BLOG_META_PAGE_TOKEN?.trim())
    && env.BLOG_META_PAGE_ID === BLOG_META_API_PAGE_ID
    && env.BLOG_META_ADMIN_VERIFIED === '1';
}
