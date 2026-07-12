import { href } from '../lib/router'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-ink2">{children}</div>
    </section>
  )
}

const CONTRIBUTORS = [
  {
    name: 'Keith Richotte, Jr.',
    role: 'Creator & Director',
    bio: 'Director of the Indigenous Peoples Law and Policy Program and Professor of Law at the University of Arizona James E. Rogers College of Law. A citizen of the Turtle Mountain Band of Chippewa Indians, he has served his tribal nation as an Associate Justice on its appellate court since 2009 and serves as Chief Justice of the appellate court of the Spirit Lake Nation. His scholarship focuses on federal Indian law and tribal constitutionalism.',
  },
  {
    name: 'Zoë Wise',
    role: 'Research & categorization',
    bio: 'A citizen of the Muscogee (Creek) Nation, she graduated from the University of Arizona College of Law in 2025 with a certificate in Indigenous Peoples Law and Policy, clerked for Chief Justice Carney of the Alaska Supreme Court, served as Editor in Chief of the Arizona Journal of Environmental Law and Policy, and clerked for the Tohono O’odham Judicial Branch.',
  },
  {
    name: 'Cas Laskowski',
    role: 'Data & technology',
    bio: 'A veteran, librarian, gamer, teacher, Latina, techie, comic book nerd, and empiricist in perpetual beta. She co-founded the Future of Law Libraries Initiative and serves on the Arizona Steering Committee on Artificial Intelligence and the Courts.',
  },
  {
    name: 'Jon Marthaler',
    role: 'Web development',
    bio: 'Holds a master’s degree in management information systems from the University of Arizona Eller College of Management and converted the database into its original website format.',
  },
]

export default function About() {
  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">About the database</h1>
      </header>

      <Section title="Purpose">
        <p>
          The Supreme Court Indian Law Database (SCILDB) was created by Keith Richotte, Jr., Director of the
          Indigenous Peoples Law and Policy Program and Professor of Law at the University of Arizona. It
          serves two primary functions: compiling a searchable repository of the federal Indian law cases
          decided by the U.S. Supreme Court, and tracking each justice's participation and opinions in those
          cases.
        </p>
        <p>
          The database defines “Indian law” as cases that define, refine, or rely upon the field of federal
          Indian law — cases that reach into tribal territories or involve substantial Native American
          participation. Not every case involving Native people qualifies: for example, criminal procedure
          cases with no connection to federal Indian law doctrine are excluded.
        </p>
      </Section>

      <Section title="Methodology">
        <p>The research team identified cases through four sequential phases:</p>
        <ol className="ml-5 flex list-decimal flex-col gap-2">
          <li>
            <strong className="font-medium text-ink">Classification search.</strong> Using the LexisNexis and
            Westlaw classification systems under the “Indians” and “Native Americans” categories, yielding 573
            potential cases.
          </li>
          <li>
            <strong className="font-medium text-ink">Natural language search.</strong> Searching the terms
            “Indian” and “Native American” expanded the pool to 2,813 potential cases.
          </li>
          <li>
            <strong className="font-medium text-ink">Individual review.</strong> Examining every case against
            the project's definition of Indian law reduced the list to 776.
          </li>
          <li>
            <strong className="font-medium text-ink">Close reading & categorization.</strong> A final close
            reading produced the definitive list, verified against Washington University Law's Supreme Court
            Database, with each case assigned to one or more of 44 thematic categories.
          </li>
        </ol>
        <p>
          Cases are organized by citation, thematic category, and individual justice participation, so the
          collection can be navigated by case name, topic area, or judicial involvement — see the{' '}
          <a href={href('/cases')} className="text-accent hover:underline">
            Cases
          </a>{' '}
          and{' '}
          <a href={href('/justices')} className="text-accent hover:underline">
            Justices
          </a>{' '}
          pages.
        </p>
      </Section>

      <Section title="Data sources">
        <ul className="ml-5 flex list-disc flex-col gap-2">
          <li>
            <a href="http://scdb.wustl.edu/" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              The Supreme Court Database (SCDB)
            </a>{' '}
            at Washington University Law supplies the structured case and justice-level voting data, including
            vote splits, opinion authorship, party coding, and dispositions.
          </li>
          <li>
            <a href="https://www.courtlistener.com/" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              CourtListener
            </a>{' '}
            (Free Law Project) provides links to the full text of opinions and docket information.
          </li>
          <li>
            <a href="https://archive.org/" target="_blank" rel="noreferrer" className="text-accent hover:underline">
              The Internet Archive
            </a>{' '}
            hosts digitized briefs and records for many of the cases.
          </li>
        </ul>
        <p>
          The “disposition for the Native party” shown throughout this site is derived from the SCDB's party
          and winning-party codes: a case is marked favorable or unfavorable only where the SCDB codes an
          Indian tribe, nation, or individual as petitioner or respondent and codes a clear winner. Cases
          without a coded Native party remain in the database because they nonetheless shape federal Indian
          law doctrine.
        </p>
      </Section>

      <Section title="Contributors">
        <div className="grid gap-4 sm:grid-cols-2">
          {CONTRIBUTORS.map((person) => (
            <div key={person.name} className="rounded-lg border border-hairline bg-surface p-4">
              <h3 className="font-serif text-base font-semibold text-ink">{person.name}</h3>
              <p className="text-xs font-medium text-accent">{person.role}</p>
              <p className="mt-2 text-sm text-ink2">{person.bio}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Contact">
        <p>
          Questions, corrections, or suggestions are welcome:{' '}
          <a href="mailto:richotte@arizona.edu" className="text-accent hover:underline">
            richotte@arizona.edu
          </a>
          .
        </p>
      </Section>
    </div>
  )
}
