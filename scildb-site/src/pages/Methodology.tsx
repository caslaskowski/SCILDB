import { useMemo } from 'react'
import { useDataset } from '../lib/data'
import { href } from '../lib/router'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-serif text-2xl font-semibold tracking-tight text-ink">{title}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-ink2">{children}</div>
    </section>
  )
}

function Phase({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-2">
      <h3 className="text-base font-semibold text-ink italic">{title}</h3>
      <div className="mt-1.5 flex flex-col gap-2">{children}</div>
    </div>
  )
}

export default function Methodology() {
  const { data } = useDataset()

  const categories = useMemo(() => {
    if (!data) return []
    const set = new Set<string>()
    for (const c of data.cases) for (const cat of c.categories) set.add(cat)
    return [...set].sort()
  }, [data])

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Methodology</h1>
        <p className="mt-1 text-sm text-ink3">April 9, 2026</p>
      </header>

      <Section title="About this Project">
        <p>
          The Supreme Court Indian Law Database has two primary functions. First, it compiles a comprehensive
          and searchable database of all federal Indian law cases adjudicated by the United States Supreme
          Court. Each case is placed into one or more categories that broadly define the issues, doctrines,
          and understandings at the heart of the case. Second, it lists the Supreme Court Justices, the cases
          within the database in which an individual justice participated, and whether that individual
          justice wrote an opinion, concurrence, or dissent in a particular case. The Database is a resource
          for academics, practitioners, policymakers, tribal citizens, or anyone who is invested in or
          curious about this body of law and its relationship to the U.S. Supreme Court.
        </p>
      </Section>

      <Section title="Definition of Indian Law">
        <p>
          The first and most important thing to note — about the database's definition of Indian law in
          particular and this project in general — is that there is room for rigorous debate and honest
          disagreement about where to draw the boundary lines. Based on our methodology, further defined
          below, we are comfortable asserting that this website offers a comprehensive list of Indian law
          Supreme Court cases. Nonetheless, in a continuing effort to refine and improve this website, we are
          open to your comments and suggestions. This includes, but is not limited to, whether a case should
          be included on the list, whether a case should be excluded from the list, and whether a case is
          labeled properly. We also urge you to treat this resource not as infallible or definitive, but
          rather as an important and useful tool to begin or continue your own research. We also ask that if
          you would like to offer comments or suggestions, you also read this methodology section and our
          definitions for our categories carefully. The easiest way to reach out about the project is by
          contacting Keith Richotte at{' '}
          <a href="mailto:richotte@arizona.edu" className="text-accent hover:underline">
            richotte@arizona.edu
          </a>
          .
        </p>
        <p className="font-semibold text-ink">
          For purposes of this database, "Indian law" is defined as cases that define, refine, or rely upon
          the field of federal Indian law. Such cases tend to either reach into Indian country or involve
          significant Native participation.
        </p>
        <p>
          This definition is broad and covers a lot of ground; however, not every case with Native
          involvement is an "Indian law" case. For example, <em>Hickory v. United States</em>, 151 U.S. 303
          (1894) and <em>Thompson v. United States</em>, 155 U.S. 271 (1894) are cases that are excluded from
          the database because while they involve Native defendants, they are criminal law cases involving
          issues of criminal procedure or the definition of crimes that do not define, refine, or rely upon
          the field of federal Indian law. Another example of a case that was consciously excluded is{' '}
          <em>Cappert v. United States</em>, 426 U.S. 128 (1976). This case is about the Reserved Water
          Rights doctrine, which Chief Justice Warren Burger notes, "applies to Indian reservations and other
          federal enclaves, encompassing water rights in navigable and nonnavigable streams." <em>Id</em>. at
          138. However, the dispute is between the federal government and a non-Native landowner with no
          direct impact on Native America. The mere mention of a doctrine that happens to apply within Indian
          law does not define, refine, or rely upon the field.
        </p>
      </Section>

      <Section title="Case Inclusion Methodology">
        <p>
          This website includes only U.S. Supreme Court Indian law cases. Determination of cases used for
          this project was largely completed in four phases.
        </p>
        <Phase title="Phase One">
          <p>
            To capture potential Indian law cases, researchers searched within classification systems
            provided by the two main legal research platforms, LexisNexis and Westlaw. Both platforms provide
            topical classification and use a hierarchical scheme to organize areas of law from broad to
            narrow. For both platforms, researchers used the broadest category to capture the most cases:
          </p>
          <ul className="ml-5 flex list-disc flex-col gap-2">
            <li>
              Under the West Key Number System, researchers used the category "Indians," key number 209.
              Researchers pulled all U.S. Supreme Court cases listed under this category and added those
              cases to a master list that was then compared to cases from LexisNexis's classification system.
            </li>
            <li>
              Similarly, using LexisNexis's classification system, Search by Topic, researchers used the
              category "Native Americans" to pull a list of cases that the research database considered
              Indian law. Researchers pulled all Supreme Court cases listed under this category and added
              those cases to a master list that was then compared to cases from the West Key Number System.
            </li>
          </ul>
          <p>At the end of Phase One, researchers had identified 573 potential Indian law cases.</p>
        </Phase>
        <Phase title="Phase Two">
          <p>
            Recognizing that the initial search did not capture all U.S. Supreme Court cases that fell under
            the project's definition of Indian law, researchers performed a natural language search on each
            research platform search using the terms "Indian" and "Native American." Researchers compared the
            results of this search with the list that had already been compiled in Phase One. After
            eliminating duplicate entries, researchers added the new cases to the original list.
          </p>
          <p>At the end of Phase Two, researchers had identified 2,813 potential Indian law cases.</p>
        </Phase>
        <Phase title="Phase Three">
          <p>
            Once the master list was compiled, researchers individually conducted an examination of all cases
            in the master list to determine if they could be classified as an "Indian law" case. Pursuant to
            the project's defined criteria, a case was considered "Indian law" if it defined, refined, or
            relied upon the field of federal Indian law.
          </p>
          <ul className="ml-5 flex list-disc flex-col gap-2">
            <li>
              During the initial determination of a case's inclusion, the researchers aimed to be
              overinclusive, considering the broad intended audience for the project. Any results that were
              not legal opinions, such as denials of certiorari or references to amicus briefs, were removed
              from the search results unless they contained substantive discussion that met the project's
              definition of Indian law.
            </li>
            <li>
              At this stage, researchers did not read every word of every case but rather performed a cursory
              search, reviewing the parties and issues present in the cases. Researchers went through the
              master list of cases that had been compiled in Phases One and Two and marked each case as
              include (meaning it was Indian law), questionable (meaning inclusion was unclear), or do not
              include.
            </li>
            <li>
              Once each of the researchers had gone through the master list of cases, each researcher's list
              of include, questionable, and do not include was combined.
            </li>
          </ul>
          <p>At the end of Phase Three, researchers had identified 776 potential Indian law cases.</p>
        </Phase>
        <Phase title="Phase Four">
          <p>
            Phase Four involved two parts: (1) giving each case a closer read and (2) categorizing them.
            Categories are listed below.
          </p>
          <p>
            While categorizing the cases, researchers considered again whether each case should be included
            in the database. For cases where each researcher categorized the case as "Not Indian Law," the
            case was automatically excluded. For cases where one or two out of the three researchers
            participating in this phase categorized the case as "Not Indian Law," the case was reviewed and
            discussed, and a decision was made as a group for inclusion in the database.
          </p>
          <p>
            After the final list of cases to include in the database was complete, researchers compared their
            list of cases to cases listed under Washington University Law's Supreme Court Database, using the
            "Indians" and "Indians, state jurisdiction over" categories. Discrepancies identified from this
            comparison were reviewed to determine if they should be included. Cases that should be included
            were reviewed in the same manner as the other cases in Phase Four and categorized accordingly.
          </p>
          <p>At the end of Phase Four, there were 682 cases.</p>
          <p>
            Once the list of cases was complete, researchers enhanced the dataset by integrating information
            from the Washington University School of Law's Supreme Court Database. Cases were matched based
            on citation, and variables, including the participating U.S. Supreme Court justices and their
            voting behavior, were incorporated into the dataset. In addition, researchers retrieved URLs for
            the full text of each case using the CourtListener's API.
          </p>
        </Phase>
      </Section>

      <Section title="Categorization Methodology">
        <p>
          Researchers for this project developed broad categories into which the different U.S. Supreme Court
          Indian law cases could fit. During Phase One and Phase Two of Case Inclusion, researchers kept note
          of recurring topics, themes, and areas of the law that could be potential categories. Based on
          this, as well as researchers' individual knowledge of Indian law from their experiences as teachers
          and students within the Indigenous Peoples Law and Policy Program at the University of Arizona
          School of Law, researchers developed a list of 43 categories for the database.
        </p>
        <p>
          After Phase Three of Case Inclusion three researchers read each case to determine which of the
          categories each case fit into. This took place from November 2024 to May 2025.
        </p>
        <p>
          Once all of the cases had been read and categorized by each of the researchers and the non-Indian
          law cases were removed (as described in Phase Four of Case Inclusion), researchers combined their
          collective categorizations for each case to see where there was agreement and disagreement. Where
          each researcher agreed on a category, that category was added to the list of "final categories" for
          the respective case. Where one or two out of three researchers agreed on the case, that case was
          marked for further review. From May to July 2025, two researchers, Professor Keith Richotte and Zoë
          Wise, read and reviewed each of the marked cases to determine where there was agreement or
          disagreement on categories. Where disagreement on a category existed even after reviewing the case,
          the researchers discussed their reasoning for listing each case in that particular category until
          they reached a consensus. During this process, researchers refined their definitions and
          understanding of each category.
        </p>
      </Section>

      <Section title="Organizational Methodology">
        <p>
          This project is organized by case citations and categorized based on broad areas of importance in
          Indian law cases. Additionally, the database is structured to reflect the participation of each
          Supreme Court Justice in these cases. This organization system allows users to navigate and analyze
          the cases based on both desired identifiers and judicial opinions.
        </p>
        <ol className="ml-5 flex list-decimal flex-col gap-3">
          <li>
            <strong className="font-medium text-ink">Case Identifiers</strong>: The database includes the
            name, citation, and year of each decision. Citations are to each case's listing in the U.S.
            Reports. Users can search by case name on the{' '}
            <a href={href('/cases')} className="text-accent hover:underline">
              Cases
            </a>{' '}
            page to find specific cases, expand a case to find further information about it, or follow a
            case's citation link to be taken to the text of the opinion.
          </li>
          <li>
            <strong className="font-medium text-ink">Categories</strong>: This website categorizes each case
            according to {categories.length > 0 ? categories.length : 43} broad but defined categories. Click
            any category to see a listing of each case that falls within it:
            <span className="mt-2 flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <a
                  key={cat}
                  href={`${href('/cases')}?cat=${encodeURIComponent(cat)}`}
                  className="rounded-full border border-hairline bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink no-underline hover:border-accent hover:bg-accent-wash hover:text-accent-strong"
                >
                  {cat}
                </a>
              ))}
            </span>
          </li>
          <li>
            <strong className="font-medium text-ink">The Participation of the Justices</strong>: Each
            individual case entry includes a breakdown of the votes cast by each Justice, including when a
            justice wrote an opinion, concurrence, or dissent in a case. Users can also use the{' '}
            <a href={href('/justices')} className="text-accent hover:underline">
              listing of historical U.S. Supreme Court Justices
            </a>{' '}
            to find individual Justices, and click on their names to see the Indian law cases they
            participated in.
          </li>
        </ol>
      </Section>
    </div>
  )
}
