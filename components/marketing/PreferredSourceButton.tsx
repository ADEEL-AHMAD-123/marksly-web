'use client';

/**
 * Google Search "Preferred Sources" button — lets a reader mark marksly.pk
 * as a preferred source so our articles get a "preferred" badge in Top
 * Stories / AI Overviews / AI Mode for that reader. This is purely a
 * promotional widget: it doesn't affect eligibility for the feature itself
 * (that's domain-level and evaluated by Google independently), it just
 * gives readers an easy way to opt in if they like our content.
 *
 * Uses Google's standard embed (loads via the <Script> tag in the parent
 * page, this just renders the target <div>):
 * https://developers.google.com/search/docs/appearance/preferred-sources
 */
export function PreferredSourceButton() {
  return (
    <div
      // eslint-disable-next-line react/no-unknown-property
      google-add-preferred-source-btn=""
      data-theme="light"
      aria-label="Add Marksly as a preferred source in Google Search"
    />
  );
}
