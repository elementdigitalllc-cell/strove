export const PRIVACY_TITLE = 'Privacy Policy';
export const TERMS_TITLE = 'Terms of Service';

function Section({ heading, children }) {
  return (
    <section>
      <h3 className="text-white font-semibold text-[14px] mb-1">{heading}</h3>
      <p className="text-[14px] leading-relaxed text-[#a1a1aa]">{children}</p>
    </section>
  );
}

export const TERMS_BODY = (
  <>
    <p className="text-[#71717a] text-[12px] uppercase tracking-wider">Last updated June 2026</p>
    <Section heading="Your account">
      You must be at least 13 years old to use Strove. You are responsible for activity under your account and for keeping your password secure. One person, one account. We may suspend accounts that abuse the platform.
    </Section>
    <Section heading="The Monthly Pot">
      Strove runs a Monthly Pot competition. Entries open at the start of each month and close on the last day. Winners are determined by community votes and verified streak activity. Pot payouts are processed within seven days of month-end. Tampering with votes, multi-accounting, or fabricating progress disqualifies you and forfeits any winnings.
    </Section>
    <Section heading="Acceptable content">
      Posts, journals, and pot entries must be your own work and must not contain hate speech, harassment, sexual content, illegal activity, or spam. We may remove content that breaks these rules and may permanently ban repeat offenders.
    </Section>
    <Section heading="Liability">
      Strove is provided as-is. We make no guarantees about uptime, results from habit-building, or the outcome of any pot. To the maximum extent allowed by law, Strove is not liable for indirect or consequential damages arising from your use of the service.
    </Section>
    <Section heading="Changes">
      We may update these terms as Strove evolves. Continued use of the app after changes means you accept the updated terms.
    </Section>
  </>
);

export const PRIVACY_BODY = (
  <>
    <p className="text-[#71717a] text-[12px] uppercase tracking-wider">Last updated June 2026</p>
    <Section heading="What we collect">
      Account info you give us (email, username, full name, optional phone), the content you post (posts, journal notes, pot entries, votes), and basic usage data (sign-in times, device type, IP address) needed to run the service.
    </Section>
    <Section heading="How we use it">
      To create and secure your account, run the pot competition, show your activity to people you allow, send essential account emails, and improve the app. We use Supabase for auth and storage; data is processed on their infrastructure under their security controls.
    </Section>
    <Section heading="What we do NOT do">
      We do not sell your data. We do not run third-party ad networks on your activity. We do not share your journal notes with anyone — they are private to your account.
    </Section>
    <Section heading="Your controls">
      You can edit your profile, delete posts, and request full account deletion from inside the app. Deletion removes your profile, posts, journal notes, and pot entries. Auth records may be retained briefly for fraud prevention before being purged.
    </Section>
    <Section heading="Contact">
      Privacy questions: privacy@strove.app. We respond within seven days.
    </Section>
  </>
);
