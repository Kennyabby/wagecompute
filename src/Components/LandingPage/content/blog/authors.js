/* ============================================================================
   Bylines.
   ----------------------------------------------------------------------------
   These are desks, not people. Inventing named authors with photographs and
   biographies would be fabricating individuals who do not exist, and a reader
   who looked one up and found nothing would be right to distrust everything
   else on the page. Organisational bylines are ordinary practice and cost the
   reader nothing.

   To move to named authors, add entries here with a real person's name, role
   and portrait, and set the post's `author` to that key. Nothing in the page
   components needs to change.
   ========================================================================= */

export const AUTHORS = {
  editorial: {
    key: 'editorial',
    name: 'Enterprise Compute',
    role: 'Editorial desk',
    bio: 'Writing on how small and mid-sized businesses actually run their numbers, their stock and their people.',
    image: 'teamWhiteboard',
  },
  finance: {
    key: 'finance',
    name: 'Enterprise Compute',
    role: 'Finance desk',
    bio: 'Bookkeeping, reporting and the obligations that come with keeping records, written for people who are not accountants.',
    image: 'accountant',
  },
  operations: {
    key: 'operations',
    name: 'Enterprise Compute',
    role: 'Operations desk',
    bio: 'Stock, suppliers, shifts and the day to day mechanics of trading.',
    image: 'warehouseTeam',
  },
  engineering: {
    key: 'engineering',
    name: 'Enterprise Compute',
    role: 'Engineering desk',
    bio: 'How the platform is built, and the infrastructure decisions behind it.',
    image: 'softwareDeveloper',
  },
}

export const authorFor = (key) => AUTHORS[key] || AUTHORS.editorial

export default AUTHORS
